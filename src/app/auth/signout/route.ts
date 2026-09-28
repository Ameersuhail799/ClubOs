import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

/**
 * Route handler to terminate authenticated sessions and invalidate SSR cookies.
 */
function createSignOutClient(request: Request, response: NextResponse) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-publishable-key";

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get("cookie") || "";
        return cookieHeader
          .split(";")
          .map((c) => c.trim())
          .filter(Boolean)
          .map((c) => {
            const [name, ...val] = c.split("=");
            return { name, value: val.join("=") };
          });
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const response = NextResponse.redirect(`${origin}/login`, {
    status: 303,
  });
  const supabase = createSignOutClient(request, response);
  await supabase.auth.signOut();
  return response;
}

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const response = NextResponse.redirect(`${origin}/login`, {
    status: 303,
  });
  const supabase = createSignOutClient(request, response);
  await supabase.auth.signOut();
  return response;
}
