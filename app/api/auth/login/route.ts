import { NextRequest, NextResponse } from "next/server";
import { signToken, comparePassword } from "@/utils/auth";
import connectDB from "@/utils/db";
import User from "@/models/User";
import Cart from "@/models/Cart";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { loginId, password, remember } = await req.json();

    if (!loginId || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await User.findOne({ 
      $or: [{ email: loginId.toLowerCase() }, { username: loginId.toLowerCase() }] 
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.password);
    
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = signToken({ id: user._id, role: user.role, status: user.status, name: user.name });

    const response = NextResponse.json({
      message: "Login successful",
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });

    // CART MERGING LOGIC
    const cartToken = req.cookies.get("cart_token")?.value;
    let finalCartId = null;

    if (cartToken) {
      try {
        const decoded: any = jwt.verify(cartToken, JWT_SECRET);
        const guestCart = await Cart.findById(decoded.cartId);
        const userCart = await Cart.findOne({ user: user._id, status: "active" });

        if (guestCart && guestCart.user === null && guestCart.status === "active") {
          if (userCart) {
            // MERGE
            for (const item of guestCart.items) {
               const existing = userCart.items.find((i:any) => i.product.toString() === item.product.toString());
               if(existing) existing.quantity += item.quantity;
               else userCart.items.push(item);
            }
            await userCart.save();
            guestCart.status = "merged";
            await guestCart.save();
            finalCartId = userCart._id;
          } else {
            // ASSIGN
            guestCart.user = user._id;
            await guestCart.save();
            finalCartId = guestCart._id;
          }
        } else if (userCart) {
           finalCartId = userCart._id;
        }
      } catch (e) {
        // failed parse
      }
    } else {
      const userCart = await Cart.findOne({ user: user._id, status: "active" });
      if(userCart) finalCartId = userCart._id;
    }

    if (finalCartId) {
       const newCartToken = jwt.sign({ cartId: finalCartId, userId: user._id }, JWT_SECRET);
       response.cookies.set("cart_token", newCartToken, {
          httpOnly: true, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7
       });
    }

    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: process.env.NODE_ENV === "production",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: remember ? 60 * 60 * 24 * 7 : 60 * 60,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
