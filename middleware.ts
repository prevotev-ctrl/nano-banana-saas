import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const url = new URL(req.url);
  const protectedPaths = ["/dashboard", "/api/generate", "/api/delete"];
  const isProtected = protectedPaths.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"));

  if (isProtected && !session) {
    if (url.pathname.startsWith("/api/")) {
      return new NextResponse(JSON.stringify({ error: "Non authentifié" }), { status: 401 });
    }
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("redirect", url.pathname + url.search);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/generate/:path*", "/api/delete/:path*"],
};

