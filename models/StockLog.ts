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
    resultingStock: { type: Number, required: true }, // stock after this change
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.models.StockLog ||
  mongoose.model("StockLog", StockLogSchema);
