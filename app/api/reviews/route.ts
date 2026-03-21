import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Review from "@/models/Review";
import { getUserFromRequest } from "@/utils/authHelpers";
import { deleteFromCloudinary } from "@/utils/cloudinary";

// GET reviews for a specific product
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    const reviews = await Review.find({ product: productId })
      .populate("user", "name profileImage")
      .sort({ createdAt: -1 });

    return NextResponse.json(reviews);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add a new review
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const data = await req.json();
    const { productId, rating, comment, images, videos } = data;

    if (!productId || !rating || !comment) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const review = await Review.create({
      product: productId,
      user: user.id || user._id,
      rating,
      comment,
      images: images || [],
      videos: videos || [],
    });

    return NextResponse.json({ message: "Review submitted successfully", review });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
