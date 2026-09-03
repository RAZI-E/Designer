import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.append("Set-Cookie", (
    "figma_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  ));
  return response;
}
