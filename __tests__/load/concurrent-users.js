/**
 * k6 Load Test — Concurrent user simulation
 *
 * Full user journey: login-equivalent auth handshake → read dashboard data →
 * save check-in → save wellness session → read updated stats
 *
 * Target: 200 concurrent users, p(95) < 600ms per operation
 *
 * Usage:
 *   k6 run --env SUPABASE_URL=<url> --env SUPABASE_ANON_KEY=<key> --env TEST_JWT=<jwt> \
 *     __tests__/load/concurrent-users.js
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ── Custom metrics ────────────────────────────────────────────────────────────
const dashboardLoadTime = new Trend('dashboard_load_ms', true);
const checkinSaveTime   = new Trend('checkin_save_ms', true);
const wellnessSaveTime  = new Trend('wellness_save_ms', true);
const errorRate         = new Rate('journey_errors');
const completedJourneys = new Counter('completed_user_journeys');

// ── Test configuration ────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    concurrent_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50  },
        { duration: '1m',  target: 200 },
        { duration: '30s', target: 200 },
        { duration: '30s', target: 0   },
      ],
    },
  },
  thresholds: {
    http_req_duration:   ['p(95)<600'],
    dashboard_load_ms:   ['p(95)<600'],
    checkin_save_ms:     ['p(95)<1000'],
    wellness_save_ms:    ['p(95)<800'],
    http_req_failed:     ['rate<0.02'],
    journey_errors:      ['rate<0.05'],
  },
};

// ── Environment config ────────────────────────────────────────────────────────
const SUPABASE_URL = __ENV.SUPABASE_URL      || 'https://YOUR_PROJECT.supabase.co';
const ANON_KEY     = __ENV.SUPABASE_ANON_KEY || '';
const JWT          = __ENV.TEST_JWT          || '';

const h = {
  'apikey':        ANON_KEY,
  'Authorization': `Bearer ${JWT}`,
  'Content-Type':  'application/json',
};

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Full user journey ─────────────────────────────────────────────────────────
export default function () {
  let journeyOk = true;

  group('1. Load dashboard data (parallel reads)', () => {
    const start = Date.now();

    const responses = http.batch([
      ['GET', `${SUPABASE_URL}/rest/v1/profiles?select=id,sovereign_score&limit=1`, null, { headers: h }],
      ['GET', `${SUPABASE_URL}/rest/v1/checkins?select=energy,clarity,stress,sleep_quality&order=created_at.desc&limit=7`, null, { headers: h }],
      ['GET', `${SUPABASE_URL}/rest/v1/wellness_sessions?select=id,type,duration_seconds&order=completed_at.desc&limit=5`, null, { headers: h }],
    ]);

    dashboardLoadTime.add(Date.now() - start);

    const allOk = responses.every((r) => r.status === 200);
    check(null, { 'dashboard reads all 200': () => allOk });
    if (!allOk) journeyOk = false;
  });

  sleep(0.3);

  group('2. Save check-in', () => {
    const energy  = randomBetween(1, 10);
    const clarity = randomBetween(1, 10);
    const stress  = randomBetween(0, 10);
    const slp     = randomBetween(1, 10);
    const score   = Math.round((energy + clarity + (10 - stress) + slp) / 4 * 100);

    const start = Date.now();
    const res = http.post(
      `${SUPABASE_URL}/rest/v1/checkins`,
      JSON.stringify({
        energy, clarity, stress,
        sleep_quality: slp,
        sovereign_score: score,
        system_need: ['Foco', 'Energía', 'Calma'][randomBetween(0, 2)],
        created_at: new Date().toISOString(),
      }),
      { headers: { ...h, 'Prefer': 'return=minimal' } },
    );
    checkinSaveTime.add(Date.now() - start);

    const ok = check(res, { 'checkin saved 2xx': (r) => r.status >= 200 && r.status < 300 });
    if (!ok) journeyOk = false;
  });

  sleep(0.5);

  group('3. Save wellness session', () => {
    const types   = ['meditation', 'breathing', 'binaural'];
    const names   = ['Calma', 'Box Breathing', 'Alpha Waves'];
    const idx     = randomBetween(0, 2);

    const start = Date.now();
    const res = http.post(
      `${SUPABASE_URL}/rest/v1/wellness_sessions`,
      JSON.stringify({
        type:             types[idx],
        session_name:     names[idx],
        duration_seconds: randomBetween(60, 900),
        completed_at:     new Date().toISOString(),
      }),
      { headers: { ...h, 'Prefer': 'return=minimal' } },
    );
    wellnessSaveTime.add(Date.now() - start);

    const ok = check(res, { 'wellness saved 2xx': (r) => r.status >= 200 && r.status < 300 });
    if (!ok) journeyOk = false;
  });

  sleep(0.2);

  group('4. Read updated stats', () => {
    const res = http.get(
      `${SUPABASE_URL}/rest/v1/profiles?select=sovereign_score&limit=1`,
      { headers: h },
    );

    check(res, {
      'updated stats 200': (r) => r.status === 200,
      'score is number': (r) => {
        const data = JSON.parse(r.body || '[]');
        return Array.isArray(data) && typeof data[0]?.sovereign_score === 'number';
      },
    });
  });

  errorRate.add(!journeyOk);
  if (journeyOk) completedJourneys.add(1);

  sleep(1 + Math.random() * 2); // Think time: 1–3s
}
