import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Server-only Supabase Admin Client.
 * Uses SUPABASE_SECRET_KEY to perform privileged administrative Auth and provisioning operations.
 *
 * SECURITY RULES:
 * - This module must NEVER be imported into Client Components or browser bundles.
 * - The secret key must never be logged, printed, or exposed over API responses.
 * - If SUPABASE_SECRET_KEY is missing, an explicit error is thrown; publishable keys are NEVER substituted.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "[ClubOS Security Error] Supabase Admin client cannot be instantiated in the browser."
    );
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "[ClubOS Configuration Error] NEXT_PUBLIC_SUPABASE_URL is not defined."
    );
  }

  if (!supabaseSecretKey) {
    throw new Error(
      "[ClubOS Configuration Error] SUPABASE_SECRET_KEY environment variable is missing. Administrative operations require a configured server-only secret key."
    );
  }

  return createClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
