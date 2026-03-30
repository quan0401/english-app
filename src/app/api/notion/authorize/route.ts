import { NextResponse } from "next/server";
import { auth } from "@/server/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL || "http://localhost:3000"));
  }

  const clientId = process.env.NOTION_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Notion client ID not configured" }, { status: 500 });
  }

  const redirectUri = process.env.NOTION_REDIRECT_URI || "http://localhost:3000/api/notion/callback";
  const state = session.user.id; // pass userId as state for the callback

  const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  return NextResponse.redirect(notionAuthUrl);
}
