// Importar versículos parseados
const versiculosRaw = require('../assets/versiculos.json');

export interface Versiculo {
  referencia: string;
  codice: string;
  texto: string;
  estrategia: string;
}

const versiculos: Versiculo[] = versiculosRaw;

/**
 * Obtiene el versículo del día basado en el día del año
 * Rotación automática: cada día muestra un versículo diferente
 */
export function getVersiculoDelDia(): Versiculo {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = Number(now) - Number(start);
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const index = dayOfYear % versiculos.length;
  return versiculos[index];
}

/**
 * Obtiene un versículo específico por índice
 */
export function getVersiculo(index: number): Versiculo {
  return versiculos[index % versiculos.length];
}

/**
 * Obtiene todos los versículos de un libro específico
 */
export function getVersiculosPorLibro(libro: string): Versiculo[] {
  return versiculos.filter((v) =>
    v.referencia.toLowerCase().startsWith(libro.toLowerCase())
  );
}

/**
 * Obtiene un versículo aleatorio de un Códice específico
 */
export function getVersiculoPorCodice(codice: string): Versiculo {
  const filtered = versiculos.filter((v) =>
    v.codice.toLowerCase().includes(codice.toLowerCase())
  );
  if (filtered.length === 0) return versiculos[0];
  const random = Math.floor(Math.random() * filtered.length);
  return filtered[random];
}

/**
 * Obtiene versículo aleatorio
 */
export function getVersiculoAleatorio(): Versiculo {
  const random = Math.floor(Math.random() * versiculos.length);
  return versiculos[random];
}

export const totalVersiculos = versiculos.length;
