import mongoose, { Schema } from "mongoose";

const RepairJobSchema = new Schema(
  {
    defectiveInventory: {
      type: Schema.Types.ObjectId,
      ref: "DefectiveInventory",
      required: true,
      index: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    quantityRepaired: {
      type: Number,
      default: 0,
      min: 0,
    },
    quantityFailed: {
      type: Number,
      default: 0,
      min: 0,
    },
    technicianOrVendor: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    repairInvoiceNo: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    vendorPhone: {
      type: String,
      default: "",
      trim: true,
    },
    vendorAddress: {
      type: String,
      default: "",
      trim: true,
    },
    estimatedCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    actualCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expectedReturnDate: {
      type: Date,
      default: null,
    },
    completionDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: [
        "In Progress",
        "Successfully Repaired",
        "Failed",
        "Partially Repaired",
      ],
      default: "In Progress",
      index: true,
    },
  },
  { timestamps: true }
);

RepairJobSchema.index({ createdAt: -1 });

delete mongoose.models.RepairJob;

export default mongoose.models.RepairJob ||
  mongoose.model("RepairJob", RepairJobSchema);
