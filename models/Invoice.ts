import mongoose, { Schema } from "mongoose";

const InvoiceSchema = new Schema(
  {
    // Legacy fields (optional for backward compatibility)
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    category: { type: Schema.Types.ObjectId, ref: "Category" },
    quantity: { type: Number },
    salePrice: { type: Number },
    description: { type: String },

    // ── Customer details ──
    customerName: { type: String, required: true },
    customerPhone: { type: String, trim: true, default: "" },
    customerEmail: { type: String, trim: true, default: "" },
    customerAddress: { type: String, trim: true, default: "" },
    customerCity: { type: String, trim: true, default: "" },
    customerNote: { type: String, trim: true, default: "" },

    // Multi-product fields
    products: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
        quantity: { type: Number, required: true },
        salePrice: { type: Number, required: true }, // Total price for this item quantity
        description: { type: String, required: false },
      },
    ],
    type: {
      type: String,
      enum: ["Sell", "Repair"],
      default: "Sell",
    },
    totalAmount: { type: Number },
    stockAlreadyDeducted: { type: Boolean, default: false },
    sourceCreditSale: { type: Schema.Types.ObjectId, ref: "CreditSale" },
    soldBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

delete mongoose.models.Invoice;

export default mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);
