/**
 * App Review 3.1.1: un revisor sin membresía de Skool vería su página de pago.
 * Ninguna pantalla puede enlazar a Skool ni mostrar «Skool» al usuario.
 */
import fs from 'fs';
import path from 'path';

const ROOTS = ['app', 'components'];

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return files(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

// Quita comentarios para que solo cuenten strings y código.
const stripComments = (src: string) =>
  src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('sin salidas a Skool', () => {
  const root = path.resolve(__dirname, '../..');
  const all = ROOTS.flatMap((r) => files(path.join(root, r)));

  it.each(all.map((f) => [path.relative(root, f), f]))('%s', (_rel, file) => {
    const code = stripComments(fs.readFileSync(file as string, 'utf8'));
    expect(code).not.toMatch(/skoolUrl/);
    expect(code).not.toMatch(/['"`>][^'"`<\n]*\bSkool\b/);
  });
});
