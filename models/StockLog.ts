import mongoose, { Schema } from "mongoose";

const StockLogSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    change: { type: Number, required: true }, // positive = added, negative = removed
    description: { type: String, required: true },
    previousStock: { type: Number }, // stock before this change (used for undo)
    resultingStock: { type: Number, required: true }, // stock after this change

    // ── Mistake correction ──
    // A log can be undone once. Undoing writes a compensating log that points
    // back to the original through `reversalOf`, and flags the original as
    // `reverted` so it can never be undone twice.
    reverted: { type: Boolean, default: false },
    revertedAt: { type: Date },
    revertedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reversalOf: { type: Schema.Types.ObjectId, ref: "StockLog", default: null },

    performedBy: { type: Schema.Types.ObjectId, ref: "User" },

    // ── Extended inventory workflow tracking ──
    movementType: {
      type: String,
      enum: [
        "adjustment",
        "opening",
        "sale",
        "order",
        "receiving_pending",
        "inspection_good",
        "inspection_defective",
        "repair_start",
        "repair_success",
        "repair_failed",
        "defective_sale",
        "scrapped",
        "defective_to_receiving",
        "defective_to_good",
        "reversal",
      ],
      default: "adjustment",
      index: true,
    },
    fromState: { type: String, default: null },
    toState: { type: String, default: null },
    quantity: { type: Number },
    receiptId: { type: Schema.Types.ObjectId, ref: "InventoryReceipt", default: null },
    defectiveId: { type: Schema.Types.ObjectId, ref: "DefectiveInventory", default: null },
    repairJobId: { type: Schema.Types.ObjectId, ref: "RepairJob", default: null },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

delete mongoose.models.StockLog;

export default mongoose.models.StockLog ||
  mongoose.model("StockLog", StockLogSchema);
