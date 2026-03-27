import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Email và mật khẩu (ít nhất 6 ký tự) là bắt buộc." },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email đã được sử dụng." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra." },
      { status: 500 }
    );
  }
}
