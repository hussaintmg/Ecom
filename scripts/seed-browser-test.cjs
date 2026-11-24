/* eslint-disable @typescript-eslint/no-require-imports */
require("../tests/register-ts.cjs");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/Ecom?serverSelectionTimeoutMS=5000";
process.env.JWT_SECRET = "local-development-secret-ecom-2026";

const connectDB = require("../utils/db.ts").default;
const User = require("../models/User.ts").default;
const Product = require("../models/Product.ts").default;
const Category = require("../models/Category.ts").default;
const InventoryReceipt = require("../models/InventoryReceipt.ts").default;

async function seed() {
  await connectDB();
  console.log("Connected to MongoDB for seeding browser test data...");

  // 1. Admin User
  const hashedPassword = await bcrypt.hash("AdminPass123!", 10);
  let admin = await User.findOne({ email: "admin@ecom.local" });
  if (!admin) {
    admin = await User.create({
      name: "Admin Tester",
      username: "admin_tester",
      email: "admin@ecom.local",
      password: hashedPassword,
      role: "admin",
      status: "Approved",
    });
    console.log("Created admin user: admin@ecom.local");
  } else {
    admin.password = hashedPassword;
    admin.status = "Approved";
    await admin.save();
    console.log("Updated admin user credentials");
  }

  // 2. Category
  let category = await Category.findOne({ name: "Industrial Hardware" });
  if (!category) {
    category = await Category.create({ name: "Industrial Hardware" });
  }

  // 3. Products
  let prodTop = await Product.findOne({ name: "Top Alpha Gear" });
  if (!prodTop) {
    prodTop = await Product.create({
      name: "Top Alpha Gear",
      description: "Upper item in receiving list",
      category: category._id,
      stock: 10,
      price: 1500,
      barcode: "GEAR-TOP-001",
    });
  }

  let prodMiddle = await Product.findOne({ name: "Middle Beta Module" });
  if (!prodMiddle) {
    prodMiddle = await Product.create({
      name: "Middle Beta Module",
      description: "Middle item in receiving list",
      category: category._id,
      stock: 20,
      price: 2500,
      barcode: "MOD-MID-002",
    });
  }

  let prodBottom = await Product.findOne({ name: "Bottom Gamma Core" });
  if (!prodBottom) {
    prodBottom = await Product.create({
      name: "Bottom Gamma Core",
      description: "Lower/Bottom item in receiving list",
      category: category._id,
      stock: 30,
      price: 3500,
      barcode: "CORE-BOT-003",
    });
  }

  // 4. Create an active shipment with all 3 products in pending state
  const receiptNumber = "REC-MULTI-TEST-" + Math.floor(1000 + Math.random() * 9000);
  const receipt = await InventoryReceipt.create({
    receiptNumber,
    vendor: "Delta Heavy Industries",
    origin: "Taiwan",
    vendorContact: "+886-2-8888-9999",
    receivedAt: new Date(),
    receivedBy: admin._id,
    notes: "Multi-product shipment test for array target verification",
    status: "Pending Inspection",
    items: [
      {
        product: prodTop._id,
        qtyReceived: 10,
        qtyPending: 10,
        qtyGood: 0,
        qtyDefective: 0,
        unitCost: 1000,
        inspectionStatus: "Pending",
      },
      {
        product: prodMiddle._id,
        qtyReceived: 15,
        qtyPending: 15,
        qtyGood: 0,
        qtyDefective: 0,
        unitCost: 1800,
        inspectionStatus: "Pending",
      },
      {
        product: prodBottom._id,
        qtyReceived: 8,
        qtyPending: 8,
        qtyGood: 0,
        qtyDefective: 0,
        unitCost: 2500,
        inspectionStatus: "Pending",
      },
    ],
  });

  console.log(`Created test shipment ${receipt.receiptNumber} with 3 items:`);
  console.log(`- Product 1 (Top): ${prodTop.name} [qtyPending: 10]`);
  console.log(`- Product 2 (Middle): ${prodMiddle.name} [qtyPending: 15]`);
  console.log(`- Product 3 (Bottom): ${prodBottom.name} [qtyPending: 8]`);

  await mongoose.disconnect();
  console.log("Seeding complete!");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
