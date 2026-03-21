import mongoose, { Schema } from "mongoose";

const CartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", default: null }, // Null for guest carts
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    status: { type: String, enum: ["active", "merged", "converted"], default: "active" },
  },
  { timestamps: true }
);

// Index to find guest carts quickly via ID (provided in cookie)
// and user carts via user ID
CartSchema.index({ user: 1 });

delete mongoose.models.Cart;

export default mongoose.models.Cart || mongoose.model("Cart", CartSchema);
