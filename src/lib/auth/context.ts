import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type { User } from "@supabase/supabase-js";

export type UserRole = Database["public"]["Enums"]["user_role"];
export type MemberStatus = Database["public"]["Enums"]["member_status"];

export interface OrganizationContext {
  user: User;
  profile: Database["public"]["Tables"]["profiles"]["Row"] | null;
  membership: Database["public"]["Tables"]["organization_members"]["Row"] | null;
  organization: Database["public"]["Tables"]["organizations"]["Row"] | null;
  primaryGroup: Database["public"]["Tables"]["groups"]["Row"] | null;
  role: UserRole | null;
  status: MemberStatus | null;
  error?: "unauthenticated" | "no_membership" | "pending" | "deactivated" | null;
}

/**
 * Retrieves the currently authenticated Supabase Auth user.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Retrieves the current user's organization membership record with relational joins.
 */
export async function getCurrentMembership() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("*, organization:organizations(*), primary_group:groups(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return membership;
}

/**
 * Resolves the complete authoritative ClubOS context:
 * auth.users -> profiles -> organization_members -> organizations -> primary_group -> role.
 *
 * Verifies active membership and identifies pending or deactivated states.
 */
export async function getCurrentOrganizationContext(): Promise<OrganizationContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null as any,
      profile: null,
      membership: null,
      organization: null,
      primaryGroup: null,
      role: null,
      status: null,
      error: "unauthenticated",
    };
  }

  // 1. Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // 2. Fetch membership record
  const { data: membership } = await supabase
    .from("organization_members")
    .select("*, organization:organizations(*), primary_group:groups(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return {
      user,
      profile,
      membership: null,
      organization: null,
      primaryGroup: null,
      role: null,
      status: null,
      error: "no_membership",
    };
  }

  if (membership.status === "pending_activation") {
    return {
      user,
      profile,
      membership,
      organization: (membership.organization as any) || null,
      primaryGroup: (membership.primary_group as any) || null,
      role: membership.role,
      status: membership.status,
      error: "pending",
    };
  }

  if (membership.status === "deactivated") {
    return {
      user,
      profile,
      membership,
      organization: (membership.organization as any) || null,
      primaryGroup: (membership.primary_group as any) || null,
      role: membership.role,
      status: membership.status,
      error: "deactivated",
    };
  }

  return {
    user,
    profile,
    membership,
    organization: membership.organization as Database["public"]["Tables"]["organizations"]["Row"],
    primaryGroup: membership.primary_group as Database["public"]["Tables"]["groups"]["Row"] | null,
    role: membership.role,
    status: membership.status,
    error: null,
  };
}

/**
 * Returns the default workspace entry path for an authoritative role.
 * main_head -> /workspace/command-center
 * group_head -> /workspace/group
 * member -> /workspace/my-day
 */
export function getRoleDefaultPath(role: UserRole): string {
  switch (role) {
    case "main_head":
      return "/workspace/command-center";
    case "group_head":
      return "/workspace/group";
    case "member":
    default:
      return "/workspace/my-day";
  }
}
