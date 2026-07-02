/**
 * markdownLite — el parser que limpia la salida de Norman (negrita, itálica,
 * divisores, encabezados, viñetas) antes de pintarla en las burbujas de chat.
 */
import { parseInline, parseMarkdownLite, stripMarkdownLite, type MdBlock } from '@/lib/markdownLite';

const textOf = (block: MdBlock): string =>
  block.kind === 'text' ? block.segments.map((s) => s.text).join('') : '···';

describe('parseInline', () => {
  it('texto plano pasa sin cambios', () => {
    expect(parseInline('hola mundo')).toEqual([{ text: 'hola mundo' }]);
  });

  it('extrae **negrita** sin asteriscos', () => {
    const segs = parseInline('antes **fuerte** después');
    expect(segs).toEqual([
      { text: 'antes ' },
      { text: 'fuerte', bold: true },
      { text: ' después' },
    ]);
  });

  it('extrae *itálica* incluyendo comillas internas', () => {
    const segs = parseInline('Tu Norte: *"Un bloque profundo antes de mensajería."*');
    expect(segs[1]).toEqual({ text: '"Un bloque profundo antes de mensajería."', italic: true });
  });

  it('negrita e itálica conviven en la misma línea', () => {
    const segs = parseInline('**Tu acción:** hazlo *hoy* mismo');
    expect(segs[0]).toEqual({ text: 'Tu acción:', bold: true });
    expect(segs.find((s) => s.italic)).toEqual({ text: 'hoy', italic: true });
  });

  it('asterisco suelto no rompe nada', () => {
    expect(parseInline('2 * 3 = 6')).toEqual([{ text: '2 * 3 = 6' }]);
  });

  it('marcador sin cerrar queda literal', () => {
    expect(parseInline('**sin cerrar').map((s) => s.text).join('')).toBe('**sin cerrar');
  });
});

describe('parseMarkdownLite', () => {
  it('--- se vuelve divisor, no texto', () => {
    const blocks = parseMarkdownLite('párrafo uno\n---\npárrafo dos');
    expect(blocks.map((b) => b.kind)).toEqual(['text', 'divider', 'text']);
  });

  it('divisores consecutivos colapsan en uno', () => {
    const blocks = parseMarkdownLite('a\n---\n---\n***\nb');
    expect(blocks.filter((b) => b.kind === 'divider')).toHaveLength(1);
  });

  it('divisores al inicio y final se eliminan', () => {
    const blocks = parseMarkdownLite('---\nsolo esto\n---');
    expect(blocks).toHaveLength(1);
    expect(textOf(blocks[0])).toBe('solo esto');
  });

  it('encabezado ## se vuelve negrita sin hashes', () => {
    const blocks = parseMarkdownLite('## Tu semana');
    expect(blocks[0].kind).toBe('text');
    const seg = (blocks[0] as { segments: { text: string; bold?: boolean }[] }).segments[0];
    expect(seg).toEqual({ text: 'Tu semana', bold: true });
  });

  it('viñeta "- " se vuelve "· "', () => {
    expect(textOf(parseMarkdownLite('- dormir 7h')[0])).toBe('· dormir 7h');
  });

  it('línea en blanco = salto de párrafo dentro del bloque', () => {
    expect(textOf(parseMarkdownLite('uno\n\ndos')[0])).toBe('uno\n\ndos');
  });

  it('string vacío devuelve lista vacía', () => {
    expect(parseMarkdownLite('')).toEqual([]);
  });

  it('respuesta típica de Norman queda limpia', () => {
    const raw = '**Tu acción antes de las 9 AM:**\nBloquea 90 minutos.\n\n---\n\nLa semilla: *¿cuántas veces?*';
    const blocks = parseMarkdownLite(raw);
    const all = blocks.map(textOf).join('|');
    expect(all).not.toContain('**');
    expect(all).not.toContain('---');
    expect(blocks.some((b) => b.kind === 'divider')).toBe(true);
  });
});

describe('stripMarkdownLite', () => {
  it('quita marcadores y divisores para vistas previas', () => {
    const raw = '**Despacho Semana 8 — Juan Jacobo**\n\n---\n\nEsta semana: *relaciones*.';
    const out = stripMarkdownLite(raw);
    expect(out).toBe('Despacho Semana 8 — Juan Jacobo\n\nEsta semana: relaciones.');
  });

  it('texto plano pasa intacto', () => {
    expect(stripMarkdownLite('sin markdown')).toBe('sin markdown');
  });
});
