import mongoose, { Schema } from "mongoose";

const ProductSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],
    videos: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    stock: { type: Number, required: true, default: 0 },
    attributes: { type: Map, of: String },
  },
  { timestamps: true }
);

ProductSchema.index({ name: "text", description: "text" });

delete mongoose.models.Product;

export default mongoose.models.Product ||
  mongoose.model("Product", ProductSchema);
