// subir-navegar.mjs — sube las video-guías de Navegar Polaris al bucket PRIVADO `navegar`.
//
// Uso (desde la raíz del repo, DESPUÉS de correr supabase/migrations/20261116000000_navegar_polaris.sql):
//   node scripts/subir-navegar.mjs <carpeta>            ← <carpeta> = ~/proyectos/polaris-tutoriales/navegar-bucket
//   node scripts/subir-navegar.mjs <carpeta> --dry-run  ← solo lista lo que subiría
// La carpeta trae cliente/ y admin/ con catalogo.json y <ID>/{video.mp4, paso-N.jpg}.
// Llaves: SUPABASE_SERVICE_ROLE_KEY y EXPO_PUBLIC_SUPABASE_URL de .env.local. Nunca las imprime. Idempotente (upsert).
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const dir = process.argv[2];
const DRY = process.argv.includes('--dry-run');
if (!dir || !fs.existsSync(path.join(dir, 'cliente', 'catalogo.json'))) {
  console.error('Uso: node scripts/subir-navegar.mjs <carpeta con cliente/ y admin/>'); process.exit(1);
}
const archivos = [];
(function recorrer(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) recorrer(p);
    else if (/^(cliente|admin)\//.test(path.relative(dir, p)) && /\.(mp4|jpg|json)$/.test(f)) archivos.push(p);
  }
})(dir);
const tipo = (f) => (f.endsWith('.mp4') ? 'video/mp4' : f.endsWith('.jpg') ? 'image/jpeg' : 'application/json');
console.log(`${archivos.length} archivos`);
if (DRY) { archivos.forEach((f) => console.log(' ', path.relative(dir, f))); process.exit(0); }

dotenv.config({ path: '.env.local' });
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Faltan EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local'); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });
let ok = 0;
for (const f of archivos) {
  const ruta = path.relative(dir, f).split(path.sep).join('/');
  const { error } = await sb.storage.from('navegar').upload(ruta, fs.readFileSync(f), { contentType: tipo(f), upsert: true });
  if (error) console.error('✗', ruta, error.message); else { ok++; process.stdout.write('.'); }
}
console.log(`\n${ok}/${archivos.length} subidos`);
