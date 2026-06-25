#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Polaris — Launch-Readiness scorecard.
#
# Loop de VERIFICACIÓN (no de generación): corre 5 gates READ-ONLY y reporta el
# estado real de cada handoff del dueño + la próxima acción. Dispáralo on-demand
# tras cada handoff:  bash scripts/launch-readiness.sh
#
# Solo lee. No escribe secretos, no aplica migraciones, no despliega. El anon key
# que usa es público (ya viaja en el bundle del cliente).
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

PROD_URL="${POLARIS_PROD_URL:-https://growthplayers.vercel.app}"
SUPA_URL=$(grep -E '^EXPO_PUBLIC_SUPABASE_URL=' .env.local 2>/dev/null | cut -d= -f2- | tr -d '\r"')
ANON=$(grep -E '^EXPO_PUBLIC_SUPABASE_ANON_KEY=' .env.local 2>/dev/null | cut -d= -f2- | tr -d '\r"')

pass(){ echo "  ✅ $1"; }
fail(){ echo "  ❌ $1"; }
warn(){ echo "  ⚠️  $1"; }

echo "═══════════ POLARIS · LAUNCH-READINESS ═══════════"

# ── 1. Gate (regresión) ──────────────────────────────────────────────────────
echo "1) Gate (tsc + tests)"
if npx tsc --noEmit >/tmp/lr_tsc.log 2>&1; then pass "tsc — 0 errores"; else fail "tsc con errores → cat /tmp/lr_tsc.log"; fi
if npx jest >/tmp/lr_jest.log 2>&1; then pass "jest — suite verde"; else fail "jest con fallos → cat /tmp/lr_jest.log"; fi
warn "gate completo = + 'npm run lint' + 'npx expo export --platform web' + smoke vivo del preview"

# ── 2. Claude vía ai-proxy ───────────────────────────────────────────────────
echo "2) Claude (ai-proxy)"
if [ -z "$SUPA_URL" ] || [ -z "$ANON" ]; then
  warn "sin EXPO_PUBLIC_SUPABASE_URL/ANON_KEY en .env.local — no puedo probar"
else
  code=$(curl -s -m 15 -o /dev/null -w "%{http_code}" -X POST \
    -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" \
    -d '{"provider":"anthropic","messages":[{"role":"user","content":"ping"}]}' \
    "$SUPA_URL/functions/v1/ai-proxy/chat" 2>/dev/null)
  case "$code" in
    200) pass "ai-proxy responde 200 — secret puesto, Claude vivo";;
    401) warn "ai-proxy desplegado pero auth-gated (401) — verifica Claude LOGUEADO en internista/Norman (el secret no se prueba con anon)";;
    503) fail "ai-proxy sin ANTHROPIC_API_KEY (503) → FALTA EL SECRET (handoff del dueño)";;
    000) fail "ai-proxy inalcanzable — ¿desplegado?";;
    *)   warn "ai-proxy HTTP $code";;
  esac
fi

# ── 3. Migraciones (probe REST) ──────────────────────────────────────────────
echo "3) Migraciones (SQL Editor)"
if [ -n "$SUPA_URL" ] && [ -n "$ANON" ]; then
  wl=$(curl -s -m 15 -o /dev/null -w "%{http_code}" -H "apikey: $ANON" "$SUPA_URL/rest/v1/web_leads?select=id&limit=1" 2>/dev/null)
  case "$wl" in
    200|401|403) pass "web_leads existe — migración 20260626 aplicada";;
    404) fail "web_leads NO existe → aplica 20260626000000_web_leads.sql";;
    *) warn "web_leads HTTP $wl";;
  esac
  wd=$(curl -s -m 15 -H "apikey: $ANON" "$SUPA_URL/rest/v1/wearable_daily?select=source_device&limit=1" 2>/dev/null)
  if echo "$wd" | grep -qi "does not exist\|could not find\|PGRST"; then
    fail "wearable_daily sin columnas del agregador → aplica 20260621 + 20260625"
  else
    pass "wearable_daily con columnas del agregador"
  fi
fi

# ── 4. Prod (Vercel) ─────────────────────────────────────────────────────────
echo "4) Prod (merge a main + deploy)"
reach=$(curl -s -m 20 -o /tmp/lr_prod.html -w "%{http_code}" "$PROD_URL/" 2>/dev/null)
if [ "$reach" != "200" ]; then
  fail "prod no responde 200 (HTTP $reach)"
else
  found=0
  # Expo serves the bundle como /_expo/static/js/web/entry-<hash>.js — y a veces
  # el src no viene literalmente con comillas dobles; agarramos cualquier ruta
  # que termine en .js (los primeros 6) y le grepeamos la tagline.
  for u in $(grep -oE '/_expo/static/js/web/[A-Za-z0-9._/-]+\.js|src="[^"]+\.js"' /tmp/lr_prod.html | sed 's/^src="//;s/"$//' | head -6); do
    [ "${u:0:1}" = "/" ] && u="$PROD_URL$u"
    if curl -s -m 60 "$u" 2>/dev/null | grep -q "PERSIGUE EL ESTADO"; then found=1; break; fi
  done
  if [ "$found" = "1" ]; then pass "prod tiene la nueva tagline — launch-hardening-p0 mergeado + desplegado";
  else fail "prod sin las mejoras (o bundle no extraíble) → merge launch-hardening-p0 → main"; fi
fi

# ── 5. Nativo ────────────────────────────────────────────────────────────────
echo "5) Nativo (eas)"
warn "eas build no verificable desde aquí — pendiente del dueño; incluye el device-test del teclado (KAV)"

echo "═══════════════════════════════════════════════════"
echo "Próxima acción del dueño: el primer ❌ de arriba."
