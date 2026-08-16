import { NextResponse } from "next/server";
import mongoose, { Schema, model, models } from "mongoose";
import jwt from "jsonwebtoken";

/* ---------- Config / DB Connection ---------- */
const MONGODB_URI = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required");
}

async function connectToDatabase() {
  const g = global as any;
  if (g._mongoosePromise) return g._mongoosePromise;
  g._mongoosePromise = mongoose.connect(MONGODB_URI, {});
  return g._mongoosePromise;
}

/* ---------- Schemas & Models ---------- */
const UserSchema = new Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ["user", "affiliate", "admin"], default: "user" },
    status: { type: String, default: "active" },
  },
  { timestamps: true, collection: "users" }
);

const User = models.User || model("User", UserSchema);

/* ---------- Auth & Admin Verification Helper ---------- */
async function verifyAdminFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) {
    const e: any = new Error("No Authorization header");
    e.status = 401;
    throw e;
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
  if (!token) {
    const e: any = new Error("No token provided");
    e.status = 401;
    throw e;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const e: any = new Error("JWT_SECRET not configured");
    e.status = 500;
    throw e;
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, secret);
  } catch (err) {
    const e: any = new Error("Invalid or expired token");
    e.status = 401;
    throw e;
  }

  if (!decoded || !decoded.id) {
    const e: any = new Error("Invalid token payload");
    e.status = 401;
    throw e;
  }

  const adminUser = await User.findById(decoded.id).select("role");
  if (!adminUser || adminUser.role !== "admin") {
    const e: any = new Error("Forbidden: Admin privileges required");
    e.status = 403;
    throw e;
  }

  return decoded;
}

/* ---------- PATCH: Update User Role ---------- */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    await verifyAdminFromRequest(req);

    const { id: targetUserId } = await params;

    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return NextResponse.json(
        { success: false, message: "Valid target user ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { role } = body;

    const allowedRoles = ["user", "affiliate", "admin"];
    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          message: `Role must be one of: ${allowedRoles.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      targetUserId,
      { role },
      { new: true, runValidators: true }
    ).select("name email role status updatedAt");

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `User role successfully updated to ${role}`,
        user: updatedUser,
      },
      { status: 200 }
    );
  } catch (err: any) {
    const status = err?.status || 500;
    const message = err?.message || "Server error updating user role";
    return NextResponse.json({ success: false, message }, { status });
  }
}