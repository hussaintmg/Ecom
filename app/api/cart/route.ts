import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import Cart from "@/models/Cart";
import { getUserFromRequest } from "@/utils/authHelpers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// Helper to get cart from token or user
async function getCart(req: NextRequest, userId?: string) {
  const cartToken = req.cookies.get("cart_token")?.value;
  let cart = null;

  if (userId) {
    cart = await Cart.findOne({ user: userId, status: "active" });
  }

  if (!cart && cartToken) {
    try {
      const decoded: any = jwt.verify(cartToken, JWT_SECRET);
      cart = await Cart.findById(decoded.cartId);
      if (cart && cart.status !== "active") cart = null;
    } catch (e) {
      // invalid token
    }
  }

  return cart;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    const userId = user?.id || user?._id;

    let cart = await getCart(req, userId);

    if (cart) {
      cart = await cart.populate("items.product");
    }

    return NextResponse.json(cart || { items: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    const userId = user?.id || user?._id;
    const { productId, quantity } = await req.json();

    let cart = await getCart(req, userId);

    if (!cart) {
      cart = await Cart.create({
        user: userId || null,
        items: [{ product: productId, quantity }],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item: any) => item.product.toString() === productId
      );
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push({ product: productId, quantity });
      }
      await cart.save();
    }

    // Generate/Update Cart Token
    const tokenPayload = { cartId: cart._id, userId: userId || null };
    const token = jwt.sign(tokenPayload, JWT_SECRET);

    const response = NextResponse.json({ message: "Added to cart", cart });
    response.cookies.set("cart_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
    try {
      await connectDB();
      const user = getUserFromRequest(req);
      const userId = user?.id || user?._id;
      const { items } = await req.json(); // Full list of items to sync
  
      let cart = await getCart(req, userId);
      if(!cart) return NextResponse.json({error: "Cart not found"}, {status: 404});
  
      cart.items = items;
      await cart.save();
  
      return NextResponse.json({ message: "Cart updated", cart });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
