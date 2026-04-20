import fs from 'fs';
import readline from 'readline';

const inFile = 'c:\\Users\\calidad.posventas\\Desktop\\App_Alco\\sql\\import_data.sql';
const outFile = 'c:\\Users\\calidad.posventas\\Desktop\\App_Alco\\sql\\import_data_inserts.sql';

console.log(`Converting ${inFile} to INSERT statements...`);

function formatVal(v) {
  if (v === '\\N') return 'NULL';
  
  // 1. Unescape postgres COPY text format
  let unescaped = [];
  for (let i = 0; i < v.length; i++) {
    if (v[i] === '\\' && i + 1 < v.length) {
      let next = v[i + 1];
      if (next === 'n') unescaped.push('\n');
      else if (next === 'r') unescaped.push('\r');
      else if (next === 't') unescaped.push('\t');
      else if (next === 'b') unescaped.push('\b');
      else if (next === 'f') unescaped.push('\f');
      else if (next === '\\') unescaped.push('\\');
      else unescaped.push(next); // For any other escaped char, just include it
      i++;
    } else {
      unescaped.push(v[i]);
    }
  }
  let finalStr = unescaped.join('');
  
  // 2. Format as a pure SQL string (duplicate single quotes)
  return "'" + finalStr.replace(/'/g, "''") + "'";
}

async function convertData() {
  if (!fs.existsSync(inFile)) {
      console.error('Error: import_data.sql not found!');
      return;
  }

  const fileStream = fs.createReadStream(inFile, { encoding: 'utf8' });
  const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
  });

  const outStream = fs.createWriteStream(outFile, { encoding: 'utf8' });
  outStream.write('-- Script de Importación de Datos (Formato INSERT)\n');
  outStream.write('-- Este script reemplaza al comando COPY que no es compatible con editores web.\n\n');

  let currentTable = '';
  let currentColumns = '';
  let isCopying = false;
  let insertsCount = 0;

  for await (const line of rl) {
      if (!isCopying) {
          if (line.startsWith('COPY ')) {
              isCopying = true;
              const match = line.match(/^COPY (.+?) \((.+?)\) FROM stdin;/);
              if (match) {
                  currentTable = match[1];
                  currentColumns = match[2];
                  outStream.write(`\n-- =========================================\n`);
                  outStream.write(`-- Insertando datos en ${currentTable}\n`);
                  outStream.write(`-- =========================================\n`);
              }
          }
      } else {
          if (line === '\\.') {
              isCopying = false;
              outStream.write(`\n`);
          } else if (line.trim() !== '') {
              let parts = line.split('\t');
              let vals = parts.map(formatVal).join(', ');
              // Add a simple INSERT statement
              outStream.write(`INSERT INTO ${currentTable} (${currentColumns}) VALUES (${vals});\n`);
              insertsCount++;
          }
      }
  }

  outStream.end();
  console.log(`Conversion completed! Generated ${insertsCount} INSERT statements in: ${outFile}`);
}

convertData().catch(console.error);
