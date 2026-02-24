import { createClient } from '@insforge/sdk';

// Credentials from .env
const url = 'https://t3ynzn25.us-east.insforge.app';
const key = 'ik_fbf305ff496bf145d460c83490afe1e2';

console.log(`Connecting to: ${url}`);

const client = createClient({
    baseUrl: url,
    anonKey: key
});

async function testConnection() {
    try {
        const tables = ['audits', 'board_tasks', 'projects', 'field_inspections', 'inspections', 'quality_claims'];

        console.log('--- Connectivity Test Results ---');

        for (const table of tables) {
            const { data, error } = await client.database.from(table).select('*').limit(1);
            if (error) {
                console.log(`[${table}]: ❌ Error (${error.code}) - ${error.message}`);
            } else {
                console.log(`[${table}]: ✅ Success - Found ${data.length} records`);
            }
        }
    } catch (e) {
        console.error('❌ Unexpected error:', e);
    }
}

testConnection();
