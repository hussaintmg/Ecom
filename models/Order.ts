import mongoose, { Schema } from "mongoose";

const OrderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: String,
        price: Number,
        quantity: { type: Number, required: true },
        image: String,
      },
    ],
    shippingAddress: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      country: { type: String, required: true },
      phone: { type: String, required: true },
      postalCode: { type: String, required: true },
      preciseLocation: String,
    },
    paymentMethod: { type: String, required: true, enum: ["COD", "Stripe"] },
    paymentId: String, // Stripe charge ID
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    itemsPrice: { type: Number, required: true },
    shippingPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    deliveredAt: Date,
    shippedAt: Date,
  },
  { timestamps: true }
);

OrderSchema.index({ user: 1 });
OrderSchema.index({ status: 1 });

delete mongoose.models.Order;

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
