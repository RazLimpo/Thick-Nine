import { NextResponse } from "next/server";
import mongoose, { Schema, model, models } from "mongoose";
import jwt from "jsonwebtoken";

/* ---------- Config / DB Connection ---------- */
const MONGODB_URI = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI || "";

async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is required");
  }

  const g = global as any;
  if (g._mongoosePromise) return g._mongoosePromise;
  g._mongoosePromise = mongoose.connect(MONGODB_URI, {});
  return g._mongoosePromise;
}

/* ---------- Schemas & Models ---------- */
const UserSchema = new Schema(
  {
    role: { type: String, default: "user" },
    wallet: {
      availableBalance: { type: Number, default: 0 },
      pendingBalance: { type: Number, default: 0 },
      lifetimeWithdrawals: { type: Number, default: 0 },
    },
  },
  { timestamps: true, strict: false, collection: "users" }
);

const WithdrawalSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
    method: { type: String, default: "unknown" },
    adminNotes: { type: String, default: "" },
  },
  { timestamps: true, collection: "withdrawals" }
);

const User = models.User || model("User", UserSchema);
const Withdrawal = models.Withdrawal || model("Withdrawal", WithdrawalSchema);

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

/* ---------- GET: Fetch All Withdrawal Requests ---------- */
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    await verifyAdminFromRequest(req);

    // Fetch all requests sorted by most recent first
    const withdrawals = await Withdrawal.find({}).sort({ createdAt: -1 });

    return NextResponse.json(
      {
        success: true,
        count: withdrawals.length,
        withdrawals,
      },
      { status: 200 }
    );
  } catch (err: any) {
    const status = err?.status || 500;
    const message = err?.message || "Server error fetching withdrawals";
    return NextResponse.json({ success: false, message }, { status });
  }
}

/* ---------- POST: Process Withdrawal Request (Approve or Reject) ---------- */
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    await verifyAdminFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { withdrawalId, action, notes } = body;

    if (!withdrawalId || !mongoose.Types.ObjectId.isValid(withdrawalId)) {
      return NextResponse.json({ success: false, message: "Valid withdrawalId is required" }, { status: 400 });
    }

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ success: false, message: "Action must be 'approve' or 'reject'" }, { status: 400 });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const withdrawal = await Withdrawal.findById(withdrawalId).session(session);
      if (!withdrawal) {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json({ success: false, message: "Withdrawal request not found" }, { status: 404 });
      }

      if (withdrawal.status !== "pending") {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json(
          { success: false, message: `Withdrawal has already been marked as ${withdrawal.status}` },
          { status: 400 }
        );
      }

      const user = await User.findById(withdrawal.userId).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json({ success: false, message: "Associated user not found" }, { status: 404 });
      }

      user.wallet = user.wallet || { availableBalance: 0, pendingBalance: 0, lifetimeWithdrawals: 0 };
      const amount = Number(withdrawal.amount);

      if (action === "approve") {
        withdrawal.status = "completed";
        withdrawal.adminNotes = notes || "Approved by admin";

        user.wallet.pendingBalance = Math.max(0, Number(((user.wallet.pendingBalance || 0) - amount).toFixed(2)));
        user.wallet.lifetimeWithdrawals = Number(((user.wallet.lifetimeWithdrawals || 0) + amount).toFixed(2));
      } else if (action === "reject") {
        withdrawal.status = "failed";
        withdrawal.adminNotes = notes || "Rejected by admin";

        user.wallet.pendingBalance = Math.max(0, Number(((user.wallet.pendingBalance || 0) - amount).toFixed(2)));
        user.wallet.availableBalance = Number(((user.wallet.availableBalance || 0) + amount).toFixed(2));
      }

      await withdrawal.save({ session });
      await user.save({ session });

      await session.commitTransaction();
      session.endSession();

      return NextResponse.json(
        {
          success: true,
          message: `Withdrawal request successfully ${action === "approve" ? "approved" : "rejected"}`,
          withdrawal,
        },
        { status: 200 }
      );
    } catch (innerErr) {
      await session.abortTransaction();
      session.endSession();
      throw innerErr;
    }
  } catch (err: any) {
    const status = err?.status || 500;
    const message = err?.message || "Server error";
    return NextResponse.json({ success: false, message }, { status });
  }
}