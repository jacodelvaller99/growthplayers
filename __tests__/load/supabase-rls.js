/**
 * k6 Security Test — Row Level Security (RLS) validation
 *
 * Verifies that:
 * 1. User A CANNOT read User B's data (cross-user data leak = 0)
 * 2. Unauthenticated requests are rejected (401/403)
 * 3. User A CANNOT write to User B's rows
 *
 * Usage:
 *   k6 run \
 *     --env SUPABASE_URL=<url> \
 *     --env SUPABASE_ANON_KEY=<key> \
 *     --env JWT_USER_A=<jwt_user_a> \
 *     --env JWT_USER_B=<jwt_user_b> \
 *     --env USER_B_ID=<uuid_user_b> \
 *     __tests__/load/supabase-rls.js
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

// ── Custom metrics ────────────────────────────────────────────────────────────
const rlsViolations    = new Counter('rls_violations');
const authRejections   = new Rate('auth_rejections_correct');
const crossUserLeaks   = new Counter('cross_user_data_leaks');

// ── Test configuration — single iteration, audit style ───────────────────────
export const options = {
  scenarios: {
    security_audit: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 10,
    },
  },
  thresholds: {
    rls_violations:  ['count<1'],    // ZERO RLS violations
    cross_user_data_leaks: ['count<1'],
  },
};

// ── Environment config ────────────────────────────────────────────────────────
const SUPABASE_URL = __ENV.SUPABASE_URL    || 'https://YOUR_PROJECT.supabase.co';
const ANON_KEY     = __ENV.SUPABASE_ANON_KEY || '';
const JWT_A        = __ENV.JWT_USER_A      || '';
const JWT_B        = __ENV.JWT_USER_B      || '';
const USER_B_ID    = __ENV.USER_B_ID       || 'user-b-placeholder-uuid';

function headers(jwt) {
  return {
    'apikey':        ANON_KEY,
    'Authorization': `Bearer ${jwt}`,
    'Content-Type':  'application/json',
  };
}

// ── Security checks ───────────────────────────────────────────────────────────
export default function () {
  // ── Test 1: Unauthenticated access should be rejected ────────────────────
  group('Unauthenticated requests rejected', () => {
    const tables = ['profiles', 'checkins', 'wellness_sessions', 'lesson_tasks', 'lesson_completed'];

    for (const table of tables) {
      const res = http.get(
        `${SUPABASE_URL}/rest/v1/${table}?select=*`,
        { headers: { 'apikey': ANON_KEY } }, // No Authorization header
      );

      // RLS should return empty array (or 401/403 depending on policy)
      const data = JSON.parse(res.body || '[]');
      const isRejected = res.status === 401 || res.status === 403 || (Array.isArray(data) && data.length === 0);

      const ok = check(res, {
        [`${table}: unauth request returns no data`]: () => isRejected,
      });

      authRejections.add(isRejected);

      if (!isRejected && Array.isArray(data) && data.length > 0) {
        rlsViolations.add(1);
        console.error(`RLS VIOLATION: ${table} returned ${data.length} rows without auth!`);
      }
    }
  });

  sleep(0.5);

  // ── Test 2: User A cannot read User B's data ─────────────────────────────
  group('Cross-user data isolation', () => {
    if (!JWT_A || !USER_B_ID) {
      console.warn('Skipping cross-user test: JWT_USER_A or USER_B_ID not set');
      return;
    }

    const tables = [
      { name: 'profiles',           filter: `id=eq.${USER_B_ID}` },
      { name: 'checkins',           filter: `user_id=eq.${USER_B_ID}` },
      { name: 'wellness_sessions',  filter: `user_id=eq.${USER_B_ID}` },
      { name: 'lesson_tasks',       filter: `user_id=eq.${USER_B_ID}` },
      { name: 'lesson_completed',   filter: `user_id=eq.${USER_B_ID}` },
    ];

    for (const { name, filter } of tables) {
      const res = http.get(
        `${SUPABASE_URL}/rest/v1/${name}?select=*&${filter}`,
        { headers: headers(JWT_A) }, // User A's JWT
      );

      const data = JSON.parse(res.body || '[]');
      const hasLeak = Array.isArray(data) && data.length > 0;

      check(res, {
        [`${name}: User A cannot see User B data`]: () => !hasLeak,
      });

      if (hasLeak) {
        crossUserLeaks.add(1);
        rlsViolations.add(1);
        console.error(`RLS CROSS-USER LEAK: ${name} returned ${data.length} rows for User B when authenticated as User A!`);
      }
    }
  });

  sleep(0.5);

  // ── Test 3: User A cannot UPDATE User B's rows ───────────────────────────
  group('Cross-user write isolation', () => {
    if (!JWT_A || !USER_B_ID) {
      console.warn('Skipping write isolation test: JWT_USER_A or USER_B_ID not set');
      return;
    }

    // Attempt to update User B's profile using User A's JWT
    const res = http.patch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${USER_B_ID}`,
      JSON.stringify({ sovereign_score: 9999 }), // Malicious write
      {
        headers: {
          ...headers(JWT_A),
          'Prefer': 'return=representation',
        },
      },
    );

    // RLS should prevent this — no rows updated = 0 or empty array
    const data = JSON.parse(res.body || '[]');
    const writeBlocked = !Array.isArray(data) || data.length === 0;

    check(res, {
      'User A cannot overwrite User B profile': () => writeBlocked,
    });

    if (!writeBlocked) {
      rlsViolations.add(1);
      crossUserLeaks.add(1);
      console.error(`CRITICAL RLS WRITE VIOLATION: User A modified User B's profile!`);
    }
  });

  sleep(1);
}
