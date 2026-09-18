const fs = require('fs');
const path = require('path');
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = (m[2] || '').trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

const mongoose = require('mongoose');
async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Ecom_23');
  const defs = await mongoose.connection.collection('defectiveinventories').find({}).toArray();
  console.log('Total defective records:', defs.length);
  for (const d of defs) {
    const p = await mongoose.connection.collection('products').findOne({ _id: d.product });
    console.log('Defective ID:', d._id.toString(), 'Product ID:', d.product?.toString(), 'Product found:', !!p, 'DefectReason:', d.defectReason, 'Available:', d.availableDefectiveQuantity);
  }
  process.exit(0);
}
run().catch(err => {
  console.error(err);
  process.exit(1);
});
