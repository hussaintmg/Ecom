import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Enquiry from "@/models/Enquiry";
import { getUserFromRequest } from "@/utils/authHelpers";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const newEnquiry = await Enquiry.create({ name, email, subject, message });
    return NextResponse.json({ message: "Enquiry submitted successfully", enquiry: newEnquiry }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = getUserFromRequest(req);
    
    // Ensure only admins & owners access this
    if (!admin || (admin.role !== "admin" && admin.role !== "owner")) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    return NextResponse.json(enquiries);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
