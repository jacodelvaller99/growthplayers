/**
 * Captura la app REAL a 390px (iPhone 14) en varias combinaciones de tema.
 *
 * El panel del navegador integrado no compone frames en esta sesión, así que
 * las capturas salen por Playwright: mismo motor, viewport de móvil de verdad y
 * los ejes puestos ANTES de cargar (via localStorage) para que no haya parpadeo.
 *
 *   node scripts/shoot-themes.mjs [urlBase] [carpetaSalida]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE = process.argv[2] ?? 'http://localhost:8081';
const OUT = process.argv[3] ?? 'C:/tmp/polaris-shots';

// Rutas públicas: sin sesión de Supabase, las privadas redirigen al login.
const ROUTES = [
  ['welcome', '/(auth)/welcome'],
  ['login', '/(auth)/login'],
  ['pricing', '/pricing'],
  ['salud', '/legal/salud'],
];

const COMBOS = [
  ['smoky-semaforo', 'dark', 'semaforo'],
  ['aura-semaforo', 'aura', 'semaforo'],
  ['tinta-semaforo', 'tinta', 'semaforo'],
  ['pizarra-calma', 'pizarra', 'calma'],
  ['carbon-ambar', 'carbon', 'ambar'],
  ['luz-semaforo', 'light', 'semaforo'],
  ['luz-nitido', 'light', 'nitido'],
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

// Sembrar la preferencia antes del primer script de la página: el provider la
// lee en su inicializador perezoso, así que la app arranca ya tematizada.
let seeded = { theme: 'dark', signal: 'oro' };
await ctx.addInitScript(() => {});

for (const [comboName, theme, signal] of COMBOS) {
  seeded = { theme, signal };
  const page = await ctx.newPage();
  await page.addInitScript(
    ([t, s]) => {
      localStorage.setItem('polaris:theme', t);
      localStorage.setItem('polaris:signal', s);
    },
    [theme, signal],
  );

  for (const [routeName, path] of ROUTES) {
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 60_000 });
    // El primer pintado de Expo Router tarda; esperar a que haya texto real.
    await page.waitForTimeout(2500);
    const file = join(OUT, `${routeName}__${comboName}.png`);
    await page.screenshot({ path: file });
    console.log('shot', file);
  }
  await page.close();
}

await browser.close();
console.log('seeded last:', JSON.stringify(seeded));
