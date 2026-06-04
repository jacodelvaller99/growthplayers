// ─────────────────────────────────────────────────────────────────────────────
// Comunidad — moderación (WS-8)
// Requisito App Store 1.2 (UGC): EULA de tolerancia cero, filtro de contenido,
// reportes y bloqueos. Este módulo centraliza el texto del EULA, el filtro de
// palabras prohibidas y los catálogos de razones de reporte.
// ─────────────────────────────────────────────────────────────────────────────

/** Versión del EULA. Si cambia el texto, súbela para re-pedir aceptación. */
export const COMMUNITY_EULA_VERSION = 1;

/** Clave de persistencia local de la aceptación del EULA (fallback offline). */
export const COMMUNITY_EULA_STORAGE_KEY = 'community_eula_accepted_v1';

export const COMMUNITY_EULA = {
  title: 'NORMAS DE LA COMUNIDAD',
  intro:
    'La comunidad Polaris es un espacio de alto estándar para el crecimiento de la tribu. Para entrar debes aceptar nuestra política de tolerancia cero.',
  rules: [
    'Cero tolerancia a contenido objetable, abuso, acoso, discursos de odio o amenazas.',
    'No se permite contenido sexual explícito, violento, ilegal ni spam.',
    'Respeta a cada miembro. El abuso resulta en suspensión inmediata.',
    'Puedes reportar cualquier publicación y bloquear a cualquier usuario.',
    'Los reportes se revisan y las cuentas que incumplan serán removidas.',
  ],
  agreement:
    'Acepto las normas y entiendo que el contenido objetable o el abuso a otros miembros no será tolerado.',
} as const;

/** Razones de reporte ofrecidas al usuario. */
export const REPORT_REASONS: { value: string; label: string }[] = [
  { value: 'abuse',        label: 'Acoso o abuso a un miembro' },
  { value: 'hate',         label: 'Discurso de odio o discriminación' },
  { value: 'sexual',       label: 'Contenido sexual o explícito' },
  { value: 'violence',     label: 'Violencia o amenazas' },
  { value: 'spam',         label: 'Spam o publicidad' },
  { value: 'other',        label: 'Otro contenido objetable' },
];

// Lista base de términos prohibidos (ES/EN). Filtro determinista del lado
// cliente: rechaza la publicación antes de enviarla. No pretende ser exhaustivo
// — la moderación humana (cola admin) + reportes/bloqueos son la red de respaldo.
const BANNED_WORDS: string[] = [
  // odio / abuso
  'maricón', 'maricon', 'puto', 'puta', 'zorra', 'perra', 'imbécil', 'imbecil',
  'idiota', 'estúpido', 'estupido', 'retrasado', 'mongólico', 'mongolico',
  'negro de mierda', 'sudaca', 'mátate', 'matate', 'suicídate', 'suicidate',
  // sexual explícito
  'porno', 'pornografía', 'pornografia',
  // inglés
  'faggot', 'nigger', 'rape', 'kys', 'kill yourself', 'whore', 'cunt', 'retard',
];

/** Normaliza para comparar (minúsculas + sin tildes). */
function normalize(input: string): string {
  // NFD separa la letra de su tilde (marca combinante U+0300–U+036F); las
  // filtramos por codepoint para no depender de literales no-ASCII en el fuente.
  return Array.from(input.toLowerCase().normalize('NFD'))
    .filter((ch) => {
      const cp = ch.codePointAt(0) ?? 0;
      return cp < 0x0300 || cp > 0x036f;
    })
    .join('');
}

const NORMALIZED_BANNED = BANNED_WORDS.map(normalize);

/**
 * Devuelve true si el texto contiene contenido prohibido.
 * Compara por límites de palabra para frases y por inclusión simple por término.
 */
export function containsBannedContent(text: string): boolean {
  const haystack = normalize(text);
  return NORMALIZED_BANNED.some((term) => {
    if (term.includes(' ')) return haystack.includes(term);
    // término simple → límite de palabra para evitar falsos positivos
    const re = new RegExp(`(^|[^a-z0-9áéíóúñ])${escapeRegExp(term)}([^a-z0-9áéíóúñ]|$)`, 'i');
    return re.test(haystack);
  });
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
