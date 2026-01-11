import Database from 'better-sqlite3';

const db = new Database('./db/fedlearn.db');

console.log('\n=== DEVICES IN DATABASE ===\n');
const devices = db.prepare('SELECT id, name, type, is_active, status FROM devices').all();
console.log(`Total devices: ${devices.length}\n`);

if (devices.length > 0) {
  devices.forEach(device => {
    console.log(`- ${device.name}`);
    console.log(`  ID: ${device.id}`);
    console.log(`  Type: ${device.type}`);
    console.log(`  Active: ${device.is_active}`);
    console.log(`  Status: ${device.status}`);
    console.log('');
  });
}

console.log('\n=== DEVICES MATCHING QUALITY CRITERIA ===\n');
const qualityDevices = db.prepare("SELECT id, name, type, is_active FROM devices WHERE type = 'camera' OR is_active = 1").all();
console.log(`Devices matching criteria (type="camera" OR is_active=1): ${qualityDevices.length}\n`);

if (qualityDevices.length > 0) {
  qualityDevices.forEach(device => {
    console.log(`- ${device.name} (${device.type})`);
  });
} else {
  console.log('⚠️  NO DEVICES MATCH THE CRITERIA!');
  console.log('This is why Generate Inspections fails.');
}

db.close();
