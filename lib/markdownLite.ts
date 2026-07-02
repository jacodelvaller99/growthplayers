/**
 * markdownLite — parser mínimo y puro para el markdown que emite Norman.
 *
 * Los modelos devuelven **negrita**, *itálica*, encabezados (#) y separadores
 * (---). La UI de chat renderizaba eso literal. Este módulo lo convierte en
 * bloques tipados que las burbujas pintan con <Text> anidados — sin
 * dependencias, sin HTML, sin sorpresas.
 *
 * Alcance deliberadamente corto: negrita, itálica, encabezado→negrita,
 * divisor y viñetas `- ` → `· `. Todo lo demás pasa como texto plano.
 */

export type MdSegment = { text: string; bold?: boolean; italic?: boolean };
export type MdBlock =
  | { kind: 'text'; segments: MdSegment[] }
  | { kind: 'divider' };

const DIVIDER_RE = /^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/;
const HEADING_RE = /^\s{0,3}#{1,6}\s+/;
const BULLET_RE = /^(\s*)[-*]\s+/;

/** Parte una línea en segmentos negrita/itálica/plano. */
export function parseInline(line: string): MdSegment[] {
  const segments: MdSegment[] = [];
  // **negrita** primero (no-greedy), luego *itálica* sobre el resto.
  const boldSplit = line.split(/(\*\*[^*]+?\*\*)/g);
  for (const chunk of boldSplit) {
    if (!chunk) continue;
    const boldMatch = /^\*\*([^*]+?)\*\*$/.exec(chunk);
    if (boldMatch) {
      segments.push({ text: boldMatch[1], bold: true });
      continue;
    }
    const italicSplit = chunk.split(/(\*[^*\n]+?\*)/g);
    for (const piece of italicSplit) {
      if (!piece) continue;
      const italicMatch = /^\*([^*\n]+?)\*$/.exec(piece);
      if (italicMatch) segments.push({ text: italicMatch[1], italic: true });
      else segments.push({ text: piece });
    }
  }
  return segments.length > 0 ? segments : [{ text: '' }];
}

/** Convierte texto crudo del modelo en bloques renderizables. */
export function parseMarkdownLite(raw: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  let current: MdSegment[] = [];
  let pendingBreak = false;

  const flush = () => {
    if (current.length > 0) {
      blocks.push({ kind: 'text', segments: current });
      current = [];
    }
    pendingBreak = false;
  };

  for (const rawLine of (raw ?? '').split('\n')) {
    if (DIVIDER_RE.test(rawLine)) {
      flush();
      // Colapsa divisores consecutivos.
      if (blocks[blocks.length - 1]?.kind !== 'divider') blocks.push({ kind: 'divider' });
      continue;
    }
    let line = rawLine;
    let forceBold = false;
    if (HEADING_RE.test(line)) {
      line = line.replace(HEADING_RE, '');
      forceBold = true;
    }
    line = line.replace(BULLET_RE, '$1· ');
    if (line.trim() === '') {
      // Línea en blanco = salto de párrafo dentro del mismo bloque.
      if (current.length > 0) pendingBreak = true;
      continue;
    }
    if (current.length > 0) current.push({ text: pendingBreak ? '\n\n' : '\n' });
    pendingBreak = false;
    for (const seg of parseInline(line)) {
      current.push(forceBold ? { ...seg, bold: true } : seg);
    }
  }
  flush();
  // Sin divisor colgando al final.
  while (blocks[blocks.length - 1]?.kind === 'divider') blocks.pop();
  while (blocks[0]?.kind === 'divider') blocks.shift();
  return blocks;
}

/** Versión texto-plano para vistas previas con numberOfLines. */
export function stripMarkdownLite(raw: string): string {
  return (raw ?? '')
    .split('\n')
    .filter((line) => !DIVIDER_RE.test(line))
    .map((line) => line.replace(HEADING_RE, '').replace(BULLET_RE, '$1· '))
    .join('\n')
    .replace(/\*\*([^*]+?)\*\*/g, '$1')
    .replace(/\*([^*\n]+?)\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
