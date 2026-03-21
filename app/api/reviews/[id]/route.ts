import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Review from "@/models/Review";
import { getUserFromRequest } from "@/utils/authHelpers";
import { deleteFromCloudinary } from "@/utils/cloudinary";

// PUT: Update a review
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { rating, comment, images, videos } = await req.json();
    const review = await Review.findById(id);

    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

    // Authorization: Must be own review
    if (review.user.toString() !== (user.id || user._id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Media Diffing cleanup
    if (images !== undefined) {
      const oldIds = review.images.map((img: any) => img.publicId);
      const newIds = images.map((img: any) => img.publicId);
      for (const pid of oldIds) {
        if (!newIds.includes(pid)) await deleteFromCloudinary(pid, "image");
      }
      review.images = images;
    }

    if (videos !== undefined) {
      const oldIds = review.videos.map((vid: any) => vid.publicId);
      const newIds = videos.map((vid: any) => vid.publicId);
      for (const pid of oldIds) {
        if (!newIds.includes(pid)) await deleteFromCloudinary(pid, "video");
      }
      review.videos = videos;
    }

    if (rating) review.rating = rating;
    if (comment) review.comment = comment;

    await review.save();
    return NextResponse.json({ message: "Review updated", review });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a review
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const review = await Review.findById(id);
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

    // Must be own review OR admin/owner
    const isOwner = review.user.toString() === (user.id || user._id);
    const isAdmin = user.role === "admin" || user.role === "owner";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Purge media
    for (const img of review.images) {
      await deleteFromCloudinary(img.publicId, "image");
    }
    for (const vid of review.videos) {
      await deleteFromCloudinary(vid.publicId, "video");
    }

    await Review.findByIdAndDelete(id);

    return NextResponse.json({ message: "Review deleted" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
