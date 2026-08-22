import mongoose, { Schema } from "mongoose";

const CreditSaleSchema = new Schema(
  {
    customerName: { type: String, required: true },
    customerPhone: { type: String, trim: true, default: "" },
    customerEmail: { type: String, trim: true, default: "" },
    customerAddress: { type: String, trim: true, default: "" },
    customerCity: { type: String, trim: true, default: "" },
    customerNote: { type: String, trim: true, default: "" },
    products: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
        quantity: { type: Number, required: true },
        salePrice: { type: Number, required: true },
        description: { type: String, required: false },
      },
    ],
    totalAmount: { type: Number, required: true },
    payments: [
      {
        amount: { type: Number, required: true },
        remainingAmount: { type: Number, required: true },
        receivedAt: { type: Date, default: Date.now },
        receivedBy: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Open", "Paid", "Reverted"],
      default: "Open",
    },
    stockRestored: { type: Boolean, default: false },
    generatedInvoice: { type: Schema.Types.ObjectId, ref: "Invoice" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

delete mongoose.models.CreditSale;

export default mongoose.models.CreditSale ||
  mongoose.model("CreditSale", CreditSaleSchema);
