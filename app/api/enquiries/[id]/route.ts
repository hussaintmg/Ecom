import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Enquiry from "@/models/Enquiry";
import { getUserFromRequest } from "@/utils/authHelpers";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getUserFromRequest(req);
    if (!admin || (admin.role !== "admin" && admin.role !== "owner")) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    await connectDB();

    const enquiry = await Enquiry.findByIdAndUpdate(
      id,
      { status: body.status },
      { new: true }
    );
    if (!enquiry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(enquiry);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getUserFromRequest(req);
    if (!admin || (admin.role !== "admin" && admin.role !== "owner")) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const enquiry = await Enquiry.findByIdAndDelete(id);
    if (!enquiry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
