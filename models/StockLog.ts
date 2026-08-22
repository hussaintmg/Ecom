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
  },
  { timestamps: true }
);

delete mongoose.models.StockLog;

export default mongoose.models.StockLog ||
  mongoose.model("StockLog", StockLogSchema);
