/**
 * Script: Generate API Key untuk BI External API
 * 
 * Cara pakai:
 *   node scripts/generate-api-key.js [label]
 * 
 * Contoh:
 *   node scripts/generate-api-key.js "Power BI Dashboard"
 *   node scripts/generate-api-key.js "Looker Studio"
 *   node scripts/generate-api-key.js "Test Key"
 */

require('dotenv').config();
const crypto = require('crypto');
const prisma = require('../api/db');

async function main() {
  const label = process.argv[2] || 'Default BI Key';

  // Generate random API key (32 bytes = 64 hex chars)
  const rawKey = crypto.randomBytes(32).toString('hex');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  try {
    const record = await prisma.m_api_keys.create({
      data: {
        label,
        key_hash: keyHash,
        scopes: ['bi:ga:read'],
        rate_limit_hour: 1000,
        created_by: 'system-cli',
      },
    });

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║          BI EXTERNAL API KEY - GENERATED SUCCESSFULLY       ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  ID     : ${record.id}`);
    console.log(`║  Label  : ${label}`);
    console.log(`║  Scopes : ${record.scopes.join(', ')}`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  🔑 API KEY (simpan ini, tidak bisa dilihat lagi!):         ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  ${rawKey}`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  Hash   : ' + keyHash.substring(0, 40) + '...');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    console.log('\n📋 Contoh penggunaan (curl):');
    console.log(`   curl -H "X-API-Key: ${rawKey}" http://localhost:5005/api/bi/ga/overview`);

    console.log('\n📋 Contoh penggunaan (PowerShell):');
    console.log(`   Invoke-RestMethod -Uri "http://localhost:5005/api/bi/ga/overview" -Headers @{"X-API-Key"="${rawKey}"}`);

    console.log('\n📋 Contoh penggunaan (fetch JS):');
    console.log(`   fetch('http://localhost:5005/api/bi/ga/overview', {`);
    console.log(`     headers: { 'X-API-Key': '${rawKey}' }`);
    console.log(`   }).then(r => r.json()).then(console.log);`);
    console.log('');

  } catch (err) {
    console.error('❌ Gagal generate API key:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
