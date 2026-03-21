import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
  type: "image" | "video";
}

/**
 * Upload a file (base64 data URI) to Cloudinary.
 * Returns the secure URL and public_id.
 */
export const uploadToCloudinary = async (
  fileDataUri: string,
  folder: string = "ecom",
  resourceType: "image" | "video" = "image"
): Promise<UploadResult> => {
  const result = await cloudinary.uploader.upload(fileDataUri, {
    folder,
    resource_type: resourceType,
  });
  return {
    url: result.secure_url,
    publicId: result.public_id,
    type: resourceType,
  };
};

/**
 * Delete a resource from Cloudinary by its public_id.
 */
export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: "image" | "video" = "image"
): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result.result === "ok";
  } catch {
    return false;
  }
};

export default cloudinary;
