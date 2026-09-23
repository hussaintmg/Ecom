import mongoose, { Schema } from "mongoose";

const DefectiveInventorySchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    receipt: {
      type: Schema.Types.ObjectId,
      ref: "InventoryReceipt",
      default: null,
      index: true,
    },
    receiptItemId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    originalQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    availableDefectiveQuantity: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    quantityRepairing: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    quantitySold: {
      type: Number,
      default: 0,
      min: 0,
    },
    quantityScrapped: {
      type: Number,
      default: 0,
      min: 0,
    },
    originalUnitCost: {
      type: Number,
      default: 0,
    },
    repairCostSpent: {
      type: Number,
      default: 0,
    },
    defectReason: {
      type: String,
      enum: [
        "Damaged",
        "Broken",
        "Missing Parts",
        "Cosmetic Damage",
        "Manufacturing Defect",
        "Packaging Damage",
        "Not Working",
        "Wrong Item",
        "Other",
      ],
      required: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: [
        "Awaiting Decision",
        "In Repair",
        "Partially In Repair",
        "Repair Completed",
        "Repair Failed",
        "Partially Resolved",
        "Sold",
        "Scrapped",
        "Returned to Receiving",
        "Moved to Good Stock",
        "Closed",
      ],
      default: "Awaiting Decision",
      index: true,
    },
  },
  { timestamps: true }
);

DefectiveInventorySchema.index({ createdAt: -1 });

delete mongoose.models.DefectiveInventory;

export default mongoose.models.DefectiveInventory ||
  mongoose.model("DefectiveInventory", DefectiveInventorySchema);
