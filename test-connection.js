import { createClient } from '@insforge/sdk';
import fs from 'fs';
import path from 'path';

// Leer directamente de .env para que nunca falle por valores "hardcodeados"
const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf8');

let url = '';
let key = '';

envContent.split('\n').forEach(line => {
    if (line.startsWith('VITE_INSFORGE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('VITE_INSFORGE_ANON_KEY=')) key = line.split('=')[1].trim();
});

console.log(`\nConnecting to dynamically parsed URL: ${url}`);

const client = createClient({
    baseUrl: url,
    anonKey: key
});

async function testConnection() {
    try {
        const tables = ['audits', 'board_tasks', 'board_columns', 'field_inspections', 'stetic_clients', 'quality_claims'];
        
        console.log('--- Connectivity Test Results ---');
        
        for (const table of tables) {
            const { data, error } = await client.database.from(table).select('*').limit(1);
            if (error) {
                console.log(`[${table}]: ❌ Error - ${error.message} (Code: ${error.code})`);
            } else {
                console.log(`[${table}]: ✅ Success - Found ${data.length} records`);
            }
        }
    } catch (e) {
        console.error('❌ Unexpected error:', e);
    }
}

testConnection();
