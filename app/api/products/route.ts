import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Product from "@/models/Product";
import Category from "@/models/Category";
import { getUserFromRequest } from "@/utils/authHelpers";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const sort = searchParams.get("sort"); // e.g. "name-asc", "name-desc", "newest", "oldest"

    let query: any = {};
    if (category) query.category = category;

    // Default sort by newest first (createdAt descending)
    let sortOption: any = { createdAt: -1 };
    if (sort === "name-asc") sortOption = { name: 1 };
    else if (sort === "name-desc") sortOption = { name: -1 };
    else if (sort === "oldest") sortOption = { createdAt: 1 };
    // "newest" is the default, so no extra condition

    const products = await Product.find(query)
      .populate("category")
      .sort(sortOption);
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);

    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const data = await req.json();
    // No price field expected
    const product = await Product.create(data);

    // Add product to category's products array
    if (data.category) {
      await Category.findByIdAndUpdate(data.category, {
        $addToSet: { products: product._id },
      });
    }

    return NextResponse.json(product);
  } catch (error: any) {
    console.log(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}