/**
 * Comprueba que cada fix de `witness-fixes.json` sigue cableado.
 *
 * POR QUÉ EXISTE: este repo tiene un patrón documentado y repetido — código
 * escrito, testeado, y NUNCA LLAMADO. `detectForbiddenLanguage` (guardarraíl
 * médico) existía con cero llamadores. `computeAndPersistInsight` aparecía una
 * sola vez en todo el repo: su propia declaración. `EmptyState`/`ErrorState`
 * estaban escritos y sin usar. El commit del cron lo llamó "la quinta aparición
 * del patrón, y la más cara".
 *
 * Las 99 suites de jest cubren la lógica TypeScript, pero NO alcanzan
 * migraciones SQL, edge functions de Deno, copy de UI ni config de pg_cron —
 * que es exactamente donde han vivido los bugs más caros. Este script cubre
 * ese hueco: un `includes()` literal por fix, sin dependencias.
 *
 * NO se usa el toolkit witness completo a propósito: su firma Ed25519 deriva
 * la clave de `sha256(gitCommit + ':ruflo-witness/v1')`, y el commit es
 * público — cualquiera regenera clave y firma. Es un checksum con ceremonia,
 * y aquí generamos y verificamos nosotros: no hay adversario del que
 * defenderse. El valor está en el inventario y en el grep, no en la firma.
 * `witness-fixes.json` se mantiene en el formato oficial por si algún día se
 * quiere el histórico temporal (`history.mjs regressions` dice en qué commit
 * se rompió): bastaría copiar verify.mjs + lib.mjs.
 *
 * Uso: node scripts/check-witness.mjs   ·   npm run witness
 */
import { readFileSync, existsSync } from 'fs';

const { fixes } = JSON.parse(readFileSync('witness-fixes.json', 'utf8'));

const regressed = [];
for (const fix of fixes) {
  if (!existsSync(fix.file)) {
    regressed.push({ ...fix, reason: 'el archivo ya no existe' });
    continue;
  }
  if (!readFileSync(fix.file, 'utf8').includes(fix.marker)) {
    regressed.push({ ...fix, reason: 'el marcador desapareció del archivo' });
  }
}

if (regressed.length === 0) {
  console.log(`witness: ${fixes.length}/${fixes.length} fixes siguen cableados.`);
  process.exit(0);
}

console.error(`\nwitness: ${regressed.length} de ${fixes.length} fixes han REGRESADO.\n`);
for (const r of regressed) {
  console.error(`  ✗ ${r.id}  (${r.file})`);
  console.error(`    ${r.reason}: ${JSON.stringify(r.marker)}`);
  console.error(`    ${r.desc}\n`);
}
console.error('Si el cambio es intencional, actualiza el `marker` en witness-fixes.json');
console.error('en el MISMO commit. Si no lo es, acabas de revertir un fix en silencio.\n');
process.exit(1);
