import mongoose, { Schema } from "mongoose";

const ReviewSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      }
    ],
    videos: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      }
    ],
  },
  { timestamps: true }
);

ReviewSchema.index({ product: 1, user: 1 });

delete mongoose.models.Review;

export default mongoose.models.Review || mongoose.model("Review", ReviewSchema);
