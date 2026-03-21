import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["owner", "admin", "user"], default: "user" },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    forgotToken: { type: String, default: null },
    forgotCode: { type: String, default: null },
    resetToken: { type: String, default: null },
    tokenExpires: { type: Date, default: null },
    lastLogin: { type: Date, default: Date.now },
    addresses: [
      {
        address: { type: String, required: true },
        city: { type: String, required: true },
        country: { type: String, required: true },
        phone: { type: String, required: true },
        postalCode: { type: String, required: true },
        preciseLocation: String,
        isDefault: { type: Boolean, default: false }
      }
    ],
    phone: String,
    profileImage: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

delete mongoose.models.User;
export default mongoose.models.User || mongoose.model("User", UserSchema);
