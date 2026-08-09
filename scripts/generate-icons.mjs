/**
 * Genera TODOS los iconos de marca desde una sola fuente.
 *
 * POR QUÉ EXISTE: el icono estaba INVERTIDO respecto a la marca — fondo dorado
 * sólido con la estrella en negro (media RGB del icon.png viejo: 241,189,4).
 * En el launcher de Android eso se veía como un cuadrado amarillo chillón, y
 * como el manifest declara `purpose: "any maskable"`, el recorte adaptativo lo
 * convertía en un bloque de color plano sin lectura de marca.
 *
 * Polaris es negro y oro: fondo oscuro, estrella dorada. El único asset que ya
 * lo tenía bien era `splash-icon.png` (estrella dorada con alfa), así que ese
 * es ahora la ÚNICA fuente y todo lo demás se deriva.
 *
 * ZONA SEGURA (por qué 64%): un icono `maskable` se recorta a la forma del
 * launcher — círculo, squircle, gota. Solo el 80% central está garantizado.
 * La estrella tiene puntas diagonales que llegan más lejos que su ancho
 * nominal, así que a 70% ya rozaban el borde del recorte circular. 64% deja
 * presencia sin arriesgar que Samsung/Pixel corten una punta.
 *
 * Uso: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { statSync } from 'fs';

const SRC = 'assets/images/splash-icon.png';
const INK = '#080808'; // = manifest background_color y Colors.dark.background,
                       // para que el splash de Chrome no dé un salto de color.

/** Estrella dorada recortada a su caja real, sin el padding transparente. */
const star = await sharp(SRC).trim({ threshold: 10 }).toBuffer();

/** Estrella centrada sobre fondo sólido. `pct` = cuánto del lienzo ocupa. */
async function onInk(size, pct) {
  const inner = Math.round(size * pct);
  const art = await sharp(star)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const off = Math.round((size - inner) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background: INK } })
    .composite([{ input: art, left: off, top: off }])
    .png({ compressionLevel: 9, palette: false }) // truecolor: el degradado dorado bandea con paleta
    .toBuffer();
}

/** Estrella centrada sobre transparente (foreground del adaptive icon). */
async function onClear(size, pct) {
  const inner = Math.round(size * pct);
  const art = await sharp(star)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const off = Math.round((size - inner) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: art, left: off, top: off }])
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

const out = [
  // App + PWA: fondo oscuro, estrella al 64% (zona segura maskable).
  ['assets/images/icon.png', await onInk(1024, 0.64)],
  ['assets/images/favicon.png', await onInk(196, 0.64)],
  ['public/icon-512.png', await onInk(512, 0.64)],
  ['public/icon-192.png', await onInk(192, 0.64)],

  // Adaptive icon de Android: el SO compone foreground sobre background y
  // recorta a 72/108 = 66% del lienzo, más agresivo que el maskable web.
  // Por eso el foreground va al 46%: dentro del 66% visible con aire.
  ['assets/images/android-icon-background.png',
    await sharp({ create: { width: 512, height: 512, channels: 4, background: INK } }).png().toBuffer()],
  ['assets/images/android-icon-foreground.png', await onClear(512, 0.46)],
];

for (const [path, buf] of out) {
  await sharp(buf).toFile(path);
  console.log(`${path.padEnd(46)} ${(statSync(path).size / 1024).toFixed(1)} KB`);
}

// android-icon-monochrome.png NO se regenera: es la silueta que Android tiñe
// con el color del tema del usuario, y ya está correcta.
console.log('\nFuente:', SRC, '· fondo:', INK, '· estrella 64% (46% en adaptive foreground)');
