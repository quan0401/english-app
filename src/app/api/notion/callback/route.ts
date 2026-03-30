import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // userId
  const error = url.searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(new URL("/settings/notion?error=denied", url.origin));
  }

  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri = process.env.NOTION_REDIRECT_URI || `${url.origin}/api/notion/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/settings/notion?error=config", url.origin));
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Notion OAuth error:", err);
      return NextResponse.redirect(new URL("/settings/notion?error=token", url.origin));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const workspaceId = tokenData.workspace_id;

    // Store in user record
    await db.user.update({
      where: { id: state },
      data: {
        notionAccessToken: accessToken,
        notionWorkspaceId: workspaceId,
      },
    });

    return NextResponse.redirect(new URL("/settings/notion?success=connected", url.origin));
  } catch (err) {
    console.error("Notion callback error:", err);
    return NextResponse.redirect(new URL("/settings/notion?error=unknown", url.origin));
  }
}
