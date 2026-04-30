/**
 * k6 Load Test — Wellness sessions throughput
 *
 * Simulates realistic wellness session save patterns:
 * - Users completing meditation/breathing/binaural sessions
 * - Concurrent session saves
 * - Session read-back after write
 *
 * Target: p(95) < 800ms end-to-end, 0 data loss
 *
 * Usage:
 *   k6 run --env SUPABASE_URL=<url> --env SUPABASE_ANON_KEY=<key> --env TEST_JWT=<jwt> \
 *     __tests__/load/wellness-sessions.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ── Custom metrics ────────────────────────────────────────────────────────────
const sessionSaveLatency = new Trend('wellness_session_save_ms', true);
const sessionReadLatency = new Trend('wellness_session_read_ms', true);
const saveErrors         = new Rate('save_errors');
const readAfterWriteOk   = new Rate('read_after_write_consistency');
const totalSessions      = new Counter('total_wellness_sessions_saved');

// ── Test configuration ────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    wellness_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 30 },
        { duration: '1m',  target: 30 },
        { duration: '20s', target: 0  },
      ],
    },
  },
  thresholds: {
    http_req_duration:           ['p(95)<800'],
    wellness_session_save_ms:    ['p(95)<800'],
    wellness_session_read_ms:    ['p(95)<500'],
    save_errors:                 ['rate<0.02'],
    read_after_write_consistency:['rate>0.98'], // 98%+ read-after-write success
  },
};

// ── Environment config ────────────────────────────────────────────────────────
const SUPABASE_URL = __ENV.SUPABASE_URL        || 'https://YOUR_PROJECT.supabase.co';
const ANON_KEY     = __ENV.SUPABASE_ANON_KEY   || '';
const JWT          = __ENV.TEST_JWT            || '';

const writeHeaders = {
  'apikey':        ANON_KEY,
  'Authorization': `Bearer ${JWT}`,
  'Content-Type':  'application/json',
  'Prefer':        'return=representation',
};

const readHeaders = {
  'apikey':        ANON_KEY,
  'Authorization': `Bearer ${JWT}`,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const SESSION_TYPES = ['meditation', 'breathing', 'binaural'];
const SESSION_NAMES = [
  'Calma Profunda', 'Alpha Waves', 'Theta Deep', '4-7-8 Breathing',
  'Box Breathing', 'Wim Hof', 'Body Scan', 'Gratitud',
];
const DURATIONS = [60, 120, 180, 300, 600, 900, 1200, 1800];

function randomSession() {
  const idx = Math.floor(Math.random() * SESSION_TYPES.length);
  return {
    type:             SESSION_TYPES[idx],
    session_name:     SESSION_NAMES[Math.floor(Math.random() * SESSION_NAMES.length)],
    duration_seconds: DURATIONS[Math.floor(Math.random() * DURATIONS.length)],
    completed_at:     new Date().toISOString(),
  };
}

// ── Virtual user scenario ─────────────────────────────────────────────────────
export default function () {
  group('wellness session save + read-back', () => {
    // 1. Save session
    const session = randomSession();
    const saveStart = Date.now();

    const saveRes = http.post(
      `${SUPABASE_URL}/rest/v1/wellness_sessions`,
      JSON.stringify(session),
      { headers: writeHeaders },
    );

    sessionSaveLatency.add(Date.now() - saveStart);
    totalSessions.add(1);

    const savedOk = check(saveRes, {
      'session save 201': (r) => r.status === 201,
      'response has id':  (r) => {
        const body = JSON.parse(r.body || '[]');
        return Array.isArray(body) && body.length > 0 && !!body[0].id;
      },
    });
    saveErrors.add(!savedOk);

    if (!savedOk) return;

    // 2. Read back the saved session
    const savedId = JSON.parse(saveRes.body)[0]?.id;
    if (!savedId) return;

    sleep(0.1);

    const readStart = Date.now();
    const readRes = http.get(
      `${SUPABASE_URL}/rest/v1/wellness_sessions?id=eq.${savedId}&select=id,type,session_name,duration_seconds`,
      { headers: readHeaders },
    );
    sessionReadLatency.add(Date.now() - readStart);

    const readOk = check(readRes, {
      'read-back 200': (r) => r.status === 200,
      'read-back matches type': (r) => {
        const data = JSON.parse(r.body || '[]');
        return Array.isArray(data) && data.length > 0 && data[0].type === session.type;
      },
      'read-back matches duration': (r) => {
        const data = JSON.parse(r.body || '[]');
        return data[0]?.duration_seconds === session.duration_seconds;
      },
    });

    readAfterWriteOk.add(readOk);
  });

  sleep(0.5 + Math.random() * 1); // 0.5–1.5s think time
}
