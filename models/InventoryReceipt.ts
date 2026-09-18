import mongoose, { Schema } from "mongoose";

const InventoryReceiptItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    qtyReceived: {
      type: Number,
      required: true,
      min: 1,
    },
    qtyPending: {
      type: Number,
      required: true,
      min: 0,
    },
    qtyGood: {
      type: Number,
      default: 0,
      min: 0,
    },
    qtyDefective: {
      type: Number,
      default: 0,
      min: 0,
    },
    unitCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    inspectionStatus: {
      type: String,
      enum: ["Pending", "Partially Inspected", "Completed"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

const InventoryReceiptSchema = new Schema(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    notes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: [
        "Pending Inspection",
        "Partially Inspected",
        "Inspection Completed",
        "Cancelled",
      ],
      default: "Pending Inspection",
      index: true,
    },
    items: [InventoryReceiptItemSchema],
  },
  { timestamps: true }
);

InventoryReceiptSchema.index({ "items.product": 1 });
InventoryReceiptSchema.index({ createdAt: -1 });

delete mongoose.models.InventoryReceipt;

export default mongoose.models.InventoryReceipt ||
  mongoose.model("InventoryReceipt", InventoryReceiptSchema);
