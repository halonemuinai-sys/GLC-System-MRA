const fs = require('fs');
const path = require('path');

const sqlFile = 'D:\\Private Project\\Helpdesk MRA\\backups\\ga_production_backup.sql';

function inspectSql() {
  try {
    if (!fs.existsSync(sqlFile)) {
      console.log('File does not exist:', sqlFile);
      return;
    }

    const content = fs.readFileSync(sqlFile, 'utf8');
    const lines = content.split('\n');
    console.log(`Read ${lines.length} lines from backup SQL.`);

    // Find lines containing INSERT INTO vehicles or similar
    const vehicleLines = [];
    lines.forEach((line, idx) => {
      if (line.includes('COPY glc_mra.vehicles') || line.includes('COPY ga.vehicles') || line.includes('INSERT INTO ga.vehicles') || line.includes('INSERT INTO glc_mra.vehicles')) {
        vehicleLines.push({ lineNum: idx + 1, content: line });
      }
    });

    console.log('Found vehicle table copying/insertion lines:');
    vehicleLines.forEach(vl => {
      console.log(`Line ${vl.lineNum}: ${vl.content}`);
      // Show next 20 lines to inspect values
      for (let i = 0; i < 20; i++) {
        if (lines[vl.lineNum + i]) {
          console.log(`  +${i + 1}: ${lines[vl.lineNum + i]}`);
        }
      }
    });

  } catch (err) {
    console.error('Error:', err);
  }
}

inspectSql();
