import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Category from "@/models/Category";
import { getUserFromRequest } from "@/utils/authHelpers";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;

    const { name, description, image } = await req.json();
    const updated = await Category.findByIdAndUpdate(
      id,
      { name, description, image },
      { new: true, runValidators: true },
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json(
        { error: "Only admins/owners can delete categories" },
        { status: 403 },
      );
    }

    const { id } = await params;

    // Check if category has products
    const category = await Category.findById(id);
    if (category.products.length > 0) {
      return NextResponse.json(
        { error: "Category has products — cannot delete" },
        { status: 400 },
      );
    }

    await Category.findByIdAndDelete(id);
    return NextResponse.json({ message: "Category deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
