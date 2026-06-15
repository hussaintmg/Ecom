import mongoose, { Schema } from "mongoose";

const InvoiceSchema = new Schema(
  {
    // Legacy fields (optional for backward compatibility)
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    category: { type: Schema.Types.ObjectId, ref: "Category" },
    quantity: { type: Number },
    salePrice: { type: Number },
    description: { type: String },

    customerName: { type: String, required: true },

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
    soldBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);
