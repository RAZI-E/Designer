import { NextRequest, NextResponse } from "next/server";
import { deleteTokenCookie, isRequestSecure } from "@/lib/figma/oauth";

export async function POST(request: NextRequest) {
  const secure = isRequestSecure(request);
  const response = NextResponse.json({ success: true });
  response.headers.append("Set-Cookie", deleteTokenCookie(secure));
  return response;
}
