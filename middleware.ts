import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAllowedEmail } from "@/lib/auth-domains";

// Must match DEMO_COOKIE in lib/demo (kept local: middleware cannot import next/headers).
const DEMO_COOKIE = "tos_demo";

// Public paths: landing, login, auth callbacks, API auth callbacks, static assets.
const PUBLIC_PREFIXES = ["/login", "/auth/", "/api/integrations/", "/_next/", "/favicon.ico"];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase configured, let pages render their setup state.
  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic(request.nextUrl.pathname)) {
    // Trial session (admin/admin): presence check only; signature is verified
    // server-side in pages. Forged cookies are rejected there.
    if (request.cookies.has(DEMO_COOKIE)) return response;
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    return NextResponse.redirect(login);
  }

  // Belajar.id-only policy: kick out sessions whose email is outside the allowlist.
  if (user && !isPublic(request.nextUrl.pathname) && !isAllowedEmail(user.email ?? "")) {
    await supabase.auth.signOut();
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("error", "domain");
    const out = NextResponse.redirect(login);
    // Clear auth cookies set during signOut refresh.
    for (const c of response.cookies.getAll()) out.cookies.set(c.name, "", { maxAge: 0, path: "/" });
    return out;
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
