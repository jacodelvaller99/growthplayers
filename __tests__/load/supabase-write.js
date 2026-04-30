/**
 * k6 Load Test — Supabase WRITE operations
 *
 * Simulates 50 concurrent users writing check-ins and wellness sessions.
 * Target: p(95) < 1000ms for writes, error rate < 1%
 *
 * Usage:
 *   k6 run --env SUPABASE_URL=<url> --env SUPABASE_ANON_KEY=<key> --env TEST_JWT=<jwt> \
 *     __tests__/load/supabase-write.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ── Custom metrics ────────────────────────────────────────────────────────────
const checkinWriteLatency  = new Trend('checkin_write_latency', true);
const wellnessWriteLatency = new Trend('wellness_write_latency', true);
const errorRate            = new Rate('write_errors');
const totalWrites          = new Counter('total_writes');

// ── Test configuration ────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },  // Ramp up to 50
        { duration: '1m',  target: 50 },  // Hold at 50
        { duration: '30s', target: 0  },  // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration:     ['p(95)<1000'],   // 95th percentile under 1s for writes
    http_req_failed:       ['rate<0.01'],
    checkin_write_latency: ['p(95)<1000'],
    wellness_write_latency:['p(95)<1000'],
    write_errors:          ['rate<0.01'],
  },
};

// ── Environment config ────────────────────────────────────────────────────────
const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const ANON_KEY     = __ENV.SUPABASE_ANON_KEY || '';
const JWT          = __ENV.TEST_JWT || '';

const headers = {
  'apikey':         ANON_KEY,
  'Authorization':  `Bearer ${JWT}`,
  'Content-Type':   'application/json',
  'Prefer':         'return=minimal',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomCheckin() {
  const energy  = randomInt(1, 10);
  const clarity = randomInt(1, 10);
  const stress  = randomInt(0, 10);
  const sleep   = randomInt(1, 10);
  const score   = Math.round((energy + clarity + (10 - stress) + sleep) / 4 * 100);

  return JSON.stringify({
    energy,
    clarity,
    stress,
    sleep_quality: sleep,
    sovereign_score: score,
    system_need: 'Foco',
    created_at: new Date().toISOString(),
  });
}

function randomWellnessSession() {
  const types = ['meditation', 'breathing', 'binaural'];
  const names = ['Calma Profunda', 'Box Breathing', 'Alpha Waves', '4-7-8', 'Delta Deep'];

  return JSON.stringify({
    type:             types[randomInt(0, 2)],
    session_name:     names[randomInt(0, 4)],
    duration_seconds: randomInt(60, 1800),
    completed_at:     new Date().toISOString(),
  });
}

// ── Virtual user scenario ─────────────────────────────────────────────────────
export default function () {
  // 1. Write a check-in (upsert)
  const checkinStart = Date.now();
  const checkinRes = http.post(
    `${SUPABASE_URL}/rest/v1/checkins`,
    randomCheckin(),
    {
      headers: {
        ...headers,
        'Prefer': 'return=minimal,resolution=merge-duplicates',
      },
    },
  );
  checkinWriteLatency.add(Date.now() - checkinStart);
  totalWrites.add(1);

  const checkinOk = check(checkinRes, {
    'checkin write 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  errorRate.add(!checkinOk);

  sleep(0.2);

  // 2. Write a wellness session (insert)
  const wellnessStart = Date.now();
  const wellnessRes = http.post(
    `${SUPABASE_URL}/rest/v1/wellness_sessions`,
    randomWellnessSession(),
    { headers },
  );
  wellnessWriteLatency.add(Date.now() - wellnessStart);
  totalWrites.add(1);

  const wellnessOk = check(wellnessRes, {
    'wellness write 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  errorRate.add(!wellnessOk);

  sleep(1 + Math.random()); // Think time: 1–2s (realistic UX flow)
}
