import { NextRequest, NextResponse } from "next/server";
import { uploadToCloudinary, deleteFromCloudinary } from "@/utils/cloudinary";
import { getUserFromRequest } from "@/utils/authHelpers";

export async function POST(req: NextRequest) {
  try {
    const { file, folder, resourceType } = await req.json();
    const user = getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "Please log in to upload" }, { status: 401 });
    }

    // Allow Admins/Owners for everything. 
    // Allow regular Users ONLY for the reviews folder.
    const isReviewFolder = folder === "ecom/reviews";
    if (user.role !== "admin" && user.role !== "owner" && !isReviewFolder) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const result = await uploadToCloudinary(
      file,
      folder || "ecom/products",
      resourceType || "image",
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: remove a file from cloudinary
export async function DELETE(req: NextRequest) {
  try {
    const { publicId, resourceType } = await req.json();
    const user = getUserFromRequest(req);

    // Check authentication
    if (!user) {
      return NextResponse.json({ error: "Please log in to delete" }, { status: 401 });
    }

    // Only allow admins and owners to delete
    if (user.role !== "admin" && user.role !== "owner") {
      return NextResponse.json({ error: "Access denied. Only admins can delete files." }, { status: 403 });
    }
    // Check if publicId is provided
    if (!publicId) {
      return NextResponse.json({ error: "No publicId provided" }, { status: 400 });
    }
    
    // Delete from Cloudinary
    const result = await deleteFromCloudinary(publicId, resourceType || "image");
    
    console.log(result)
    if (!result) {
      return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "File deleted successfully",
      result: result
    });

  } catch (error: any) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}