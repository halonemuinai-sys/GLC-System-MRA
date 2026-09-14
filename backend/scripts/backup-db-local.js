require('dotenv').config({ path: __dirname + '/../.env' });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { execSync } = require('child_process');

const dbUri = process.env.DIRECT_URL || process.env.DATABASE_URL;
const outputDir = process.env.BACKUP_OUTPUT_DIR || 'C:\\Users\\ariss\\Database_Backups\\GLC_MRA';
const schemas = ['glc_mra', 'marketing_budget', 'helpdesk'];

async function runNativePgBackup(client, backupPath) {
  console.log(`[Backup Engine] Running Native SQL Dumper for schemas: ${schemas.join(', ')}...`);
  const stream = fs.createWriteStream(backupPath, { encoding: 'utf8' });

  stream.write(`-- GLC MRA System Native SQL Database Backup\n`);
  stream.write(`-- Generated: ${new Date().toISOString()}\n\n`);

  for (const schema of schemas) {
    stream.write(`-- ==============================================\n`);
    stream.write(`-- SCHEMA: ${schema}\n`);
    stream.write(`-- ==============================================\n`);
    stream.write(`CREATE SCHEMA IF NOT EXISTS "${schema}";\n`);
    stream.write(`SET search_path TO "${schema}", public;\n\n`);

    // Get all tables in schema
    const tablesRes = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' ORDER BY table_name`,
      [schema]
    );

    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(` -> Schema "${schema}": Found ${tables.length} tables`);

    for (const table of tables) {
      const fullTable = `"${schema}"."${table}"`;
      try {
        const rowsRes = await client.query(`SELECT * FROM ${fullTable}`);
        const rows = rowsRes.rows;

        if (rows.length === 0) continue;

        const columnsRes = await client.query(
          `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position`,
          [schema, table]
        );
        const colNames = columnsRes.rows.map(c => `"${c.column_name}"`).join(', ');

        stream.write(`-- Data for ${fullTable} (${rows.length} rows)\n`);

        for (const row of rows) {
          const valStrings = Object.values(row).map(val => {
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number' || typeof val === 'boolean') return String(val);
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            return `'${String(val).replace(/'/g, "''")}'`;
          });

          stream.write(`INSERT INTO ${fullTable} (${colNames}) VALUES (${valStrings.join(', ')}) ON CONFLICT DO NOTHING;\n`);
        }
        stream.write(`\n`);
      } catch (err) {
        console.warn(`    [Warning] Could not dump table ${fullTable}: ${err.message}`);
      }
    }
  }

  stream.end();
  await new Promise((resolve) => stream.on('finish', resolve));
}

async function cleanOldBackups() {
  if (!fs.existsSync(outputDir)) return;
  const files = fs.readdirSync(outputDir);
  const now = Date.now();
  const maxAgeMs = 30 * 24 * 60 * 60 * 1000; // 30 days

  let count = 0;
  for (const file of files) {
    if (file.startsWith('glc_mra_backup_') && file.endsWith('.sql')) {
      const filePath = path.join(outputDir, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        console.log(` -> Deleted old backup file: ${file}`);
        count++;
      }
    }
  }
  if (count === 0) console.log(` -> Cleanup checked: No backup files older than 30 days.`);
}

function setupScheduler(timeStr = '23:00', taskName = 'GLC_MRA_Daily_Database_Backup') {
  const scriptPath = path.resolve(__filename);
  const taskCommand = `node "${scriptPath}"`;

  const args = [
    '/create',
    '/tn', taskName,
    '/tr', taskCommand,
    '/sc', 'daily',
    '/st', timeStr,
    '/f'
  ];

  try {
    console.log(`Registering task '${taskName}' in Windows Task Scheduler at ${timeStr} WIB...`);
    const { execFileSync } = require('child_process');
    const out = execFileSync('schtasks', args, { encoding: 'utf8' });
    console.log(`✓ SUCCESS! Windows Task Scheduler task registered successfully.`);
    console.log(out);
  } catch (err) {
    console.error(`Failed to register task in Task Scheduler: ${err.message}`);
    process.exit(1);
  }
}

async function main() {
  if (process.argv[2] === 'setup-scheduler') {
    setupScheduler(process.argv[3] || '23:00');
    return;
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFilename = `glc_mra_backup_${dateStr}.sql`;
  const backupPath = path.join(outputDir, backupFilename);

  console.log(`====================================================`);
  console.log(` GLC MRA System — Automated Local Database Backup`);
  console.log(` Destination: ${backupPath}`);
  console.log(`====================================================\n`);

  // Check if Docker is available
  let dockerAvailable = false;
  try {
    execSync('docker info', { stdio: 'ignore' });
    dockerAvailable = true;
  } catch (e) {
    dockerAvailable = false;
  }

  if (dockerAvailable) {
    console.log(`[Engine] Docker Desktop is running! Using postgres:17-alpine pg_dump...`);
    try {
      const schemaFlags = schemas.map(s => `-n ${s}`).join(' ');
      const cmd = `docker run --rm -i postgres:17-alpine pg_dump "${dbUri}" ${schemaFlags} > "${backupPath}"`;
      execSync(cmd, { shell: 'cmd.exe', stdio: 'inherit' });
    } catch (err) {
      console.warn(`Docker pg_dump failed (${err.message}). Falling back to Native Node.js Dumper...`);
      dockerAvailable = false;
    }
  }

  if (!dockerAvailable) {
    console.log(`[Engine] Docker Desktop is offline. Using Native Node.js Database Dumper...`);
    const { parse } = require('pg-connection-string');
    const config = parse(dbUri);
    config.ssl = { rejectUnauthorized: false };
    const client = new Client(config);
    await client.connect();
    await runNativePgBackup(client, backupPath);
    await client.end();
  }

  const stat = fs.statSync(backupPath);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
  console.log(`\n✓ SUCCESS! Backup created successfully (${sizeMb} MB)`);
  console.log(`  Path: ${backupPath}\n`);

  console.log(`Checking old backup retention...`);
  await cleanOldBackups();
  console.log(`\n====================================================\n`);
}

main().catch(err => {
  console.error('Fatal backup error:', err);
  process.exit(1);
});
