import fs from 'fs';
import readline from 'readline';

const dumpFile = 'c:\\Users\\CALIDA~1.POS\\AppData\\Local\\Temp\\peazip-tmp\\.ptmpC8F491\\20260304_021728.sql';
const outputFile = 'c:\\Users\\calidad.posventas\\Desktop\\App_Alco\\sql\\import_data.sql';

async function extractData() {
    console.log(`Starting data extraction from: ${dumpFile}`);
    
    if (!fs.existsSync(dumpFile)) {
        console.error('Error: The dump file does not exist at the given path.');
        return;
    }

    const fileStream = fs.createReadStream(dumpFile, { encoding: 'utf8' });
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const outStream = fs.createWriteStream(outputFile, { encoding: 'utf8' });
    outStream.write('-- Script de Importación de Datos (Solo esquema Public)\n');
    outStream.write('-- Debes ejecutar este script DESPUÉS de haber ejecutado init_db_schema.sql\n\n');

    let isCopying = false;
    let linesCopied = 0;

    for await (const line of rl) {
        if (!isCopying) {
            // Buscamos líneas que empiecen con COPY public.
            if (line.startsWith('COPY public.')) {
                isCopying = true;
                outStream.write(line + '\n');
            }
            // También la tabla profiles suele venir de public
             else if (line.startsWith('COPY auth.users ')) {
                 // Si necesitan recuperar a los usuarios (email, pass), es arriesgado
                 // importarlo directamente con COPY sin saltarse reglas.
                 // InsForge prefiere que se creen los usuarios vía API.
                 // No los vamos a importar con COPY puro aquí para evitar romper la app t3ynzn25, 
                 // a menos que sea un proyecto self-hosted o un export raw desde Supabase Dashboard admin.
                 // Si el user lo requiere, lo evaluamos. Por ahora omitimos Auth y System data.
            }
        } else {
            outStream.write(line + '\n');
            linesCopied++;
            // Final del bloque COPY
            if (line === '\\.') {
                isCopying = false;
                outStream.write('\n'); // un salto de línea adicional
            }
        }
    }

    outStream.end();
    console.log(`Extraction complete! Saved ${linesCopied} data lines to: ${outputFile}`);
}

extractData().catch(console.error);
