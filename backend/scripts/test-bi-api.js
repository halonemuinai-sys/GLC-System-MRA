/**
 * Script: Test semua endpoint BI External API
 * 
 * Cara pakai:
 *   node scripts/test-bi-api.js <API_KEY> [BASE_URL]
 * 
 * Contoh:
 *   node scripts/test-bi-api.js abc123def456...
 *   node scripts/test-bi-api.js abc123def456... https://glc-api.vercel.app
 */

const API_KEY = process.argv[2];
const BASE_URL = process.argv[3] || 'http://localhost:5005';

if (!API_KEY) {
  console.error('❌ Harap masukkan API key sebagai argument pertama.');
  console.error('   Contoh: node scripts/test-bi-api.js <YOUR_API_KEY>');
  process.exit(1);
}

const ENDPOINTS = [
  { path: '/api/bi/ga/overview',    label: 'GA Overview KPIs' },
  { path: '/api/bi/ga/expenses',    label: 'Expenses (Budget vs Actual)' },
  { path: '/api/bi/ga/assets',      label: 'Asset Breakdown' },
  { path: '/api/bi/ga/vendors',     label: 'Vendor Status' },
  { path: '/api/bi/ga/maintenance', label: 'Maintenance Cost Trend' },
  { path: '/api/bi/ga/insurance',   label: 'Insurance Premiums' },
  { path: '/api/bi/ga/scorecard',   label: 'KPI Scorecard (7 Metrics)' },
];

async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint.path}?fiscal_year=2025`;
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      headers: { 'X-API-Key': API_KEY },
    });
    const elapsed = Date.now() - startTime;
    const body = await response.json();

    if (response.ok) {
      const dataKeys = Object.keys(body);
      const dataSize = JSON.stringify(body).length;
      return {
        ...endpoint,
        status: response.status,
        ok: true,
        elapsed,
        dataKeys: dataKeys.join(', '),
        dataSize: `${(dataSize / 1024).toFixed(1)} KB`,
      };
    } else {
      return {
        ...endpoint,
        status: response.status,
        ok: false,
        elapsed,
        error: body.error || JSON.stringify(body),
      };
    }
  } catch (err) {
    return {
      ...endpoint,
      status: 'NETWORK_ERROR',
      ok: false,
      elapsed: Date.now() - startTime,
      error: err.message,
    };
  }
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           GLC MRA — BI External API Test Runner                ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  Base URL  : ${BASE_URL}`);
  console.log(`║  API Key   : ${API_KEY.substring(0, 12)}...${API_KEY.substring(API_KEY.length - 6)}`);
  console.log(`║  Endpoints : ${ENDPOINTS.length}`);
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Test 1: Unauthorized (tanpa API key)
  console.log('── Test 1: Request tanpa API Key (harus 401) ─────────────────────');
  try {
    const r = await fetch(`${BASE_URL}/api/bi/ga/overview`);
    const b = await r.json();
    console.log(`   Status: ${r.status} ${r.status === 401 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Body  : ${JSON.stringify(b)}`);
  } catch (err) {
    console.log(`   ❌ NETWORK ERROR: ${err.message}`);
  }
  console.log('');

  // Test 2: Invalid API key
  console.log('── Test 2: Request dengan API Key salah (harus 401) ──────────────');
  try {
    const r = await fetch(`${BASE_URL}/api/bi/ga/overview`, {
      headers: { 'X-API-Key': 'invalid-key-12345' },
    });
    const b = await r.json();
    console.log(`   Status: ${r.status} ${r.status === 401 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Body  : ${JSON.stringify(b)}`);
  } catch (err) {
    console.log(`   ❌ NETWORK ERROR: ${err.message}`);
  }
  console.log('');

  // Test 3: Valid API key — test semua endpoint
  console.log('── Test 3: Semua Endpoint dengan API Key valid ───────────────────');
  console.log('');

  const results = [];
  for (const ep of ENDPOINTS) {
    process.stdout.write(`   Testing ${ep.label}...`);
    const result = await testEndpoint(ep);
    results.push(result);

    if (result.ok) {
      console.log(` ✅ ${result.status} (${result.elapsed}ms) — ${result.dataSize} [${result.dataKeys}]`);
    } else {
      console.log(` ❌ ${result.status} — ${result.error}`);
    }
  }

  // Summary
  console.log('');
  console.log('── Summary ──────────────────────────────────────────────────────');
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`   ✅ Passed : ${passed}/${results.length}`);
  console.log(`   ❌ Failed : ${failed}/${results.length}`);
  console.log(`   ⏱  Avg    : ${Math.round(results.reduce((a, r) => a + r.elapsed, 0) / results.length)}ms`);
  console.log('');

  if (failed > 0) {
    console.log('   ⚠️  Endpoint yang gagal:');
    results.filter(r => !r.ok).forEach(r => {
      console.log(`      - ${r.label}: ${r.error}`);
    });
    console.log('');
  }

  // Test 4: Query filter
  console.log('── Test 4: Query Filter (fiscal_year + company_id) ───────────────');
  try {
    const r = await fetch(`${BASE_URL}/api/bi/ga/overview?fiscal_year=2025&company_id=1`, {
      headers: { 'X-API-Key': API_KEY },
    });
    const b = await r.json();
    console.log(`   Status: ${r.status} ${r.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Keys  : ${Object.keys(b).join(', ')}`);
  } catch (err) {
    console.log(`   ❌ NETWORK ERROR: ${err.message}`);
  }
  console.log('');

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(passed === results.length
    ? '  🎉 Semua test PASSED! API siap digunakan external client.'
    : '  ⚠️  Ada test yang FAILED, cek error di atas.'
  );
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
}

main();
