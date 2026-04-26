const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../assets/versiculos.txt');
const outputPath = path.join(__dirname, '../assets/versiculos.json');

try {
  const raw = fs.readFileSync(filePath, 'utf-8');

  const versiculos = raw
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
    `✅ ${versiculos.length} versículos parseados correctamente`
  );
  console.log(`   Guardados en: assets/versiculos.json`);
  console.log(`   Primero: ${versiculos[0]?.referencia}`);
  console.log(`   Último: ${versiculos[versiculos.length - 1]?.referencia}`);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
