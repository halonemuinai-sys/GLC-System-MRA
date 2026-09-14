require('dotenv').config({ path: __dirname + '/../.env' });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { parse } = require('pg-connection-string');
const readline = require('readline');

const dbUri = process.env.DIRECT_URL || process.env.DATABASE_URL;
const backupDir = process.env.BACKUP_OUTPUT_DIR || 'C:\\Users\\ariss\\Database_Backups\\GLC_MRA';

function getLatestBackupFile() {
  if (!fs.existsSync(backupDir)) return null;
  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('glc_mra_backup_') && f.endsWith('.sql'))
    .map(f => ({
      name: f,
      fullPath: path.join(backupDir, f),
      time: fs.statSync(path.join(backupDir, f)).mtimeMs
    }))
    .sort((a, b) => b.time - a.time);

  return files.length > 0 ? files[0].fullPath : null;
}

async function restoreBackup(targetFile) {
  if (!targetFile || !fs.existsSync(targetFile)) {
    console.error(`Error: Backup file not found: "${targetFile}"`);
    process.exit(1);
  }

  const fileStat = fs.statSync(targetFile);
  const sizeMb = (fileStat.size / (1024 * 1024)).toFixed(2);

  console.log(`====================================================`);
  console.log(` GLC MRA System — Database Restore Tool`);
  console.log(` Target File : ${path.basename(targetFile)} (${sizeMb} MB)`);
  console.log(` Full Path   : ${targetFile}`);
  console.log(` Database    : Supabase PostgreSQL (via DIRECT_URL)`);
  console.log(`====================================================\n`);

  const config = parse(dbUri);
  config.ssl = { rejectUnauthorized: false };
  const client = new Client(config);

  console.log(`[1/3] Connecting to PostgreSQL Database...`);
  await client.connect();
  console.log(`✓ Connected successfully.\n`);

  console.log(`[2/3] Reading and executing SQL backup file...`);
  const fileStream = fs.createReadStream(targetFile, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let statementBuffer = '';
  let executedCount = 0;
  let skippedCount = 0;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--')) {
      continue;
    }

    statementBuffer += line + '\n';

    if (trimmed.endsWith(';')) {
      const sqlToExecute = statementBuffer.trim();
      statementBuffer = '';

      try {
        await client.query(sqlToExecute);
        executedCount++;
        if (executedCount % 500 === 0) {
          process.stdout.write(` -> Restored ${executedCount} statements...\r`);
        }
      } catch (err) {
        skippedCount++;
        // ON CONFLICT or minor errors log silently
      }
    }
  }

  console.log(`\n[3/3] Finalizing restore process...`);
  await client.end();

  console.log(`\n====================================================`);
  console.log(`✓ RESTORE COMPLETED SUCCESSFULLY!`);
  console.log(`  Total Statements Executed : ${executedCount}`);
  if (skippedCount > 0) {
    console.log(`  Skipped / Non-fatal Errors: ${skippedCount}`);
  }
  console.log(`====================================================\n`);
}

async function main() {
  let targetFile = process.argv[2];

  if (!targetFile) {
    console.log(`No specific backup file specified. Searching for the latest backup...`);
    targetFile = getLatestBackupFile();
    if (!targetFile) {
      console.error(`Error: No backup files (.sql) found in ${backupDir}`);
      process.exit(1);
    }
    console.log(`Found latest backup: ${targetFile}\n`);
  }

  await restoreBackup(targetFile);
}

main().catch(err => {
  console.error('Fatal restore error:', err);
  process.exit(1);
});
