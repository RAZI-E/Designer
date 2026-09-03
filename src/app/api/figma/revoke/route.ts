import { NextResponse } from "next/server";
import { deleteTokenCookie } from "@/lib/figma/oauth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.append("Set-Cookie", deleteTokenCookie());
  return response;
}
