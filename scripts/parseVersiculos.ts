import * as fs from 'fs';
import * as path from 'path';

interface Versiculo {
  referencia: string;    // "Romanos 13:1"
  codice: string;        // "Códice de Autoridades Establecidas"
  texto: string;         // "No hay autoridad sino..."
  estrategia: string;    // "Honra las estructuras legítimas..."
}

const filePath = path.join(__dirname, '../assets/versiculos.txt');
const outputPath = path.join(__dirname, '../assets/versiculos.json');

try {
  const raw = fs.readFileSync(filePath, 'utf-8');

  const versiculos: Versiculo[] = raw
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const parts = line.split(' | ');
      return {
        referencia: parts[0]?.trim() ?? '',
        codice: parts[1]?.trim() ?? '',
        texto: parts[2]?.trim() ?? '',
        estrategia: parts[3]?.replace('Estrategia: ', '').trim() ?? '',
      };
    })
    .filter((v) => v.referencia && v.texto);

  fs.writeFileSync(outputPath, JSON.stringify(versiculos, null, 2), 'utf-8');

  console.log(
    `✅ ${versiculos.length} versículos parseados correctamente y guardados en assets/versiculos.json`
  );
  console.log(`   Primero: ${versiculos[0]?.referencia}`);
  console.log(`   Último: ${versiculos[versiculos.length - 1]?.referencia}`);
} catch (error) {
  console.error('❌ Error al parsear versículos:', error);
  process.exit(1);
}
