import mongoose, { Schema } from "mongoose";

const EnquirySchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "Reviewed", "Resolved"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

delete mongoose.models.Enquiry;
export default mongoose.models.Enquiry || mongoose.model("Enquiry", EnquirySchema);
