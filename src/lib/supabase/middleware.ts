import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

/**
 * Manages Supabase session refresh and boundary route protection for Next.js App Router.
 * Refreshes expired auth cookies on every request and prevents unauthenticated access to workspace routes.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;
  const isWorkspaceRoute = pathname.startsWith("/workspace");
  const isAuthRoute = pathname === "/login" || pathname === "/recover";

  const allCookies = request.cookies.getAll();
  const hasAuthCookies = allCookies.some((c) => c.name.startsWith("sb-"));

  // Fast-path bypass for public routes when no auth session needs refreshing
  if (!isWorkspaceRoute && (!isAuthRoute || !hasAuthCookies)) {
    return supabaseResponse;
  }

  // Fast-path for unauthenticated workspace access
  if (isWorkspaceRoute && !hasAuthCookies) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return allCookies;
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Calling getUser verifies the JWT against Supabase Auth servers and refreshes the token if needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Protect workspace routes from unauthenticated access
  if (pathname.startsWith("/workspace")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(url);
    }
  }

  // 2. If already authenticated and accessing login/recover, direct towards workspace
  if (user && (pathname === "/login" || pathname === "/recover")) {
    const url = request.nextUrl.clone();
    url.pathname = "/workspace";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
