/**
 * k6 Stress Test — Spike to 500 concurrent users
 *
 * Documents performance degradation point.
 * Measures: at what VU count does p(95) exceed 2000ms?
 *
 * Stages:
 *   0 → 100 VUs (30s) — baseline
 *   100 → 200 VUs (30s)
 *   200 → 500 VUs (1m) — SPIKE
 *   500 → 200 VUs (30s) — recovery
 *   200 → 0 VUs (30s)
 *
 * Usage:
 *   k6 run --env SUPABASE_URL=<url> --env SUPABASE_ANON_KEY=<key> --env TEST_JWT=<jwt> \
 *     __tests__/load/stress-spike.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

// ── Custom metrics ────────────────────────────────────────────────────────────
const readLatency     = new Trend('stress_read_latency_ms', true);
const writeLatency    = new Trend('stress_write_latency_ms', true);
const errorRate       = new Rate('stress_errors');
const timeouts        = new Counter('request_timeouts');
const activeVUs       = new Gauge('active_vus_snapshot');

// ── Test configuration ────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },  // Baseline
        { duration: '30s', target: 200 },  // Ramp
        { duration: '1m',  target: 500 },  // SPIKE — document degradation here
        { duration: '30s', target: 200 },  // Recovery
        { duration: '30s', target: 0   },  // Ramp down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // These thresholds are intentionally lenient for a stress test — we document, not gate
    http_req_duration:    ['p(95)<5000'],  // 5s max even under spike
    http_req_failed:      ['rate<0.20'],   // Allow up to 20% errors under extreme load
    stress_read_latency_ms:  ['p(95)<5000'],
    stress_write_latency_ms: ['p(95)<5000'],
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

// ── Virtual user scenario (simplified — read-heavy to simulate dashboard) ────
export default function () {
  activeVUs.add(__VU);

  // READ: profile + recent checkins (dashboard loads)
  const readStart = Date.now();
  const readRes = http.get(
    `${SUPABASE_URL}/rest/v1/checkins?select=energy,clarity,stress,sovereign_score&order=created_at.desc&limit=7`,
    { headers: h, timeout: '10s' },
  );
  const readMs = Date.now() - readStart;
  readLatency.add(readMs);

  const readOk = check(readRes, {
    'read 200': (r) => r.status === 200,
    'read under 3s': () => readMs < 3000,
  });
  if (!readOk) errorRate.add(true);
  if (readRes.status === 0) timeouts.add(1); // Timeout / network error

  sleep(0.1);

  // WRITE: one check-in per VU (represents a check-in on app open)
  const energy = Math.floor(Math.random() * 10) + 1;
  const writeStart = Date.now();
  const writeRes = http.post(
    `${SUPABASE_URL}/rest/v1/checkins`,
    JSON.stringify({
      energy,
      clarity:        Math.floor(Math.random() * 10) + 1,
      stress:         Math.floor(Math.random() * 11),
      sleep_quality:  Math.floor(Math.random() * 10) + 1,
      sovereign_score: Math.round(energy / 10 * 1000),
      created_at:     new Date().toISOString(),
    }),
    { headers: { ...h, 'Prefer': 'return=minimal' }, timeout: '10s' },
  );
  const writeMs = Date.now() - writeStart;
  writeLatency.add(writeMs);

  const writeOk = check(writeRes, {
    'write 2xx': (r) => r.status >= 200 && r.status < 300,
    'write under 3s': () => writeMs < 3000,
  });
  if (!writeOk) errorRate.add(true);
  if (writeRes.status === 0) timeouts.add(1);

  // Minimal think time under stress (realistic: users hammering)
  sleep(0.2 + Math.random() * 0.3);
}

// ── Summary hook — documents degradation point ────────────────────────────────
export function handleSummary(data) {
  const p95Read  = data.metrics['stress_read_latency_ms']?.values?.['p(95)'] ?? 0;
  const p95Write = data.metrics['stress_write_latency_ms']?.values?.['p(95)'] ?? 0;
  const errRate  = data.metrics['stress_errors']?.values?.rate ?? 0;
  const toCount  = data.metrics['request_timeouts']?.values?.count ?? 0;

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      p95_read_ms:   Math.round(p95Read),
      p95_write_ms:  Math.round(p95Write),
      error_rate_pct: (errRate * 100).toFixed(2),
      total_timeouts: toCount,
      degradation_note: p95Read > 2000
        ? `DEGRADATION detected at high VU counts — p(95) reads exceeded 2000ms`
        : 'System within acceptable range under spike',
    },
  };

  return {
    'stdout': JSON.stringify(report, null, 2),
    '__tests__/load/stress-spike-report.json': JSON.stringify(report, null, 2),
  };
}
