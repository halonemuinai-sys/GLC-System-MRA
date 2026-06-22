require('dotenv').config();
const prisma = require('../api/db');

async function run() {
  const existing = await prisma.legal_documents.findMany({ where: { module: 'sop' }, select: { id: true, doc_name: true } });
  console.log(`Found ${existing.length} old dummy SOP rows in legal_documents:`, existing.map(d => d.doc_name));

  if (existing.length === 0) {
    console.log('Nothing to clean up.');
    return;
  }

  await prisma.legal_audit_logs.deleteMany({ where: { module: 'sop' } });
  const result = await prisma.legal_documents.deleteMany({ where: { module: 'sop' } });
  console.log(`Deleted ${result.count} old dummy SOP rows from legal_documents.`);
}

run().catch(console.error).finally(() => process.exit(0));
