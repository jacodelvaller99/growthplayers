/**
 * k6 Load Test — Supabase READ operations
 *
 * Simulates 100 concurrent users reading profiles, check-ins, and wellness sessions.
 * Target: p(95) < 500ms, error rate < 1%
 *
 * Usage:
 *   k6 run --env SUPABASE_URL=<url> --env SUPABASE_ANON_KEY=<key> --env TEST_JWT=<jwt> \
 *     __tests__/load/supabase-read.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ── Custom metrics ────────────────────────────────────────────────────────────
const profileReadLatency   = new Trend('profile_read_latency', true);
const checkinReadLatency   = new Trend('checkin_read_latency', true);
const wellnessReadLatency  = new Trend('wellness_read_latency', true);
const errorRate            = new Rate('errors');
const totalRequests        = new Counter('total_requests');

// ── Test configuration ────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    constant_load: {
      executor: 'constant-vus',
      vus: 100,
      duration: '2m',
    },
  },
  thresholds: {
    http_req_duration:    ['p(95)<500'],     // 95th percentile under 500ms
    http_req_failed:      ['rate<0.01'],     // Less than 1% errors
    profile_read_latency: ['p(95)<500'],
    checkin_read_latency: ['p(95)<500'],
    wellness_read_latency:['p(95)<500'],
    errors:               ['rate<0.01'],
  },
};

// ── Environment config ────────────────────────────────────────────────────────
const SUPABASE_URL  = __ENV.SUPABASE_URL  || 'https://YOUR_PROJECT.supabase.co';
const ANON_KEY      = __ENV.SUPABASE_ANON_KEY || '';
const JWT           = __ENV.TEST_JWT || '';

const headers = {
  'apikey':        ANON_KEY,
  'Authorization': `Bearer ${JWT}`,
  'Content-Type':  'application/json',
};

// ── Virtual user scenario ─────────────────────────────────────────────────────
export default function () {
  // 1. Read profile
  const profileStart = Date.now();
  const profileRes = http.get(
    `${SUPABASE_URL}/rest/v1/profiles?select=id,sovereign_score,streak&limit=1`,
    { headers },
  );
  profileReadLatency.add(Date.now() - profileStart);
  totalRequests.add(1);

  const profileOk = check(profileRes, {
    'profile status 200': (r) => r.status === 200,
    'profile returns array': (r) => Array.isArray(JSON.parse(r.body || '[]')),
  });
  errorRate.add(!profileOk);

  sleep(0.1);

  // 2. Read recent check-ins
  const checkinStart = Date.now();
  const checkinRes = http.get(
    `${SUPABASE_URL}/rest/v1/checkins?select=id,energy,clarity,stress,sleep,sovereign_score,created_at&order=created_at.desc&limit=7`,
    { headers },
  );
  checkinReadLatency.add(Date.now() - checkinStart);
  totalRequests.add(1);

  const checkinOk = check(checkinRes, {
    'checkin status 200': (r) => r.status === 200,
    'checkin returns array': (r) => Array.isArray(JSON.parse(r.body || '[]')),
  });
  errorRate.add(!checkinOk);

  sleep(0.1);

  // 3. Read wellness sessions
  const wellnessStart = Date.now();
  const wellnessRes = http.get(
    `${SUPABASE_URL}/rest/v1/wellness_sessions?select=id,type,session_name,duration_seconds,completed_at&order=completed_at.desc&limit=20`,
    { headers },
  );
  wellnessReadLatency.add(Date.now() - wellnessStart);
  totalRequests.add(1);

  const wellnessOk = check(wellnessRes, {
    'wellness status 200': (r) => r.status === 200,
    'wellness returns array': (r) => Array.isArray(JSON.parse(r.body || '[]')),
  });
  errorRate.add(!wellnessOk);

  sleep(0.5 + Math.random() * 0.5); // Think time: 0.5–1.0s
}
