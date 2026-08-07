import { Client } from '@neondatabase/serverless';
const client = new Client(process.env.DIRECT_DATABASE_URL);
await client.connect();
const { rows } = await client.query(`update vocab_candidates set status='draft' where word_gujarati = 'હૈ' and status='rejected' returning id`);
console.log('reverted:', rows);
await client.end();
