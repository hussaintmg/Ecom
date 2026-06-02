// app/api/invoices/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Invoice from "@/models/Invoice";
import { getUserFromRequest } from "@/utils/authHelpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    
    const invoice = await Invoice.findById(id)
      .populate("product", "name price images stock description")
      .populate("category", "name")
      .populate("soldBy", "name email role");
    
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      invoice,
    });
    
  } catch (error: any) {
    console.error("GET invoice error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    
    const user = getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }
    
    const invoice = await Invoice.findByIdAndDelete(id);
    
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Invoice deleted successfully",
    });
    
  } catch (error: any) {
    console.error("DELETE invoice error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}