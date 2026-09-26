"use client";

import React, { useState, useTransition, useMemo } from "react";
import { type DirectoryMember, type OrganizationGroup } from "@/lib/members/service";
import {
  createMemberInvitationAction,
  resendMemberInvitationAction,
  revokeInvitationAction,
  resetAccessAction,
  deactivateMemberAction,
  reactivateMemberAction,
} from "@/lib/members/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { HeadlineMd, BodyMd, LabelCaps, LabelCode } from "@/components/ui/Typography";

interface MembersDirectoryClientProps {
  initialMembers: DirectoryMember[];
  groups: OrganizationGroup[];
  organizationName: string;
  currentUserId: string;
}

type ModalType =
  | null
  | { type: "add" }
  | { type: "details"; member: DirectoryMember }
  | { type: "deactivate"; member: DirectoryMember }
  | { type: "reactivate"; member: DirectoryMember }
  | { type: "revoke"; member: DirectoryMember }
  | { type: "reset_access"; member: DirectoryMember };

interface NotificationState {
  type: "success" | "error";
  message: string;
}

export function MembersDirectoryClient({
  initialMembers,
  groups,
  organizationName,
  currentUserId,
}: MembersDirectoryClientProps) {
  const [members, setMembers] = useState<DirectoryMember[]>(initialMembers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [isPending, startTransition] = useTransition();

  // Add Member Form state
  const [addFullName, setAddFullName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addRole, setAddRole] = useState<"member" | "group_head">("member");
  const [addGroupId, setAddGroupId] = useState(groups[0]?.id || "");
  const [addFormError, setAddFormError] = useState<string | null>(null);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = member.fullName.toLowerCase().includes(query);
        const matchesEmail = member.email.toLowerCase().includes(query);
        const matchesPhone = member.phone?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesPhone) return false;
      }

      // Role filter
      if (roleFilter !== "all" && member.role !== roleFilter) {
        return false;
      }

      // Group filter
      if (groupFilter !== "all" && member.primaryGroupId !== groupFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && member.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [members, searchQuery, roleFilter, groupFilter, statusFilter]);

  // Handle invitation creation
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError(null);

    if (!addFullName.trim()) {
      setAddFormError("Full name is required.");
      return;
    }
    if (!addEmail.trim()) {
      setAddFormError("Institutional email is required.");
      return;
    }
    if (!addGroupId) {
      setAddFormError("A primary functional group must be assigned.");
      return;
    }

    const formData = new FormData();
    formData.append("fullName", addFullName.trim());
    formData.append("email", addEmail.trim().toLowerCase());
    if (addPhone.trim()) formData.append("phone", addPhone.trim());
    formData.append("role", addRole);
    formData.append("primaryGroupId", addGroupId);

    startTransition(async () => {
      const res = await createMemberInvitationAction(null, formData);
      if (res.error) {
        setAddFormError(res.error);
      } else {
        setNotification({
          type: "success",
          message: res.message || `Invitation successfully dispatched to ${addEmail}.`,
        });
        // Optimistically insert / update member in local state
        const targetGroup = groups.find((g) => g.id === addGroupId);
        const optimisticMember: DirectoryMember = {
          id: res.invitationId || `temp-${Date.now()}`,
          userId: `user-${Date.now()}`,
          fullName: addFullName.trim(),
          email: addEmail.trim().toLowerCase(),
          phone: addPhone.trim() || null,
          avatarUrl: null,
          role: addRole,
          primaryGroupId: addGroupId,
          primaryGroupName: targetGroup?.name || null,
          primaryGroupSlug: targetGroup?.slug || null,
          status: "pending_activation",
          joinedAt: new Date().toISOString(),
          deactivatedAt: null,
          invitationId: res.invitationId,
          invitationStatus: "pending",
          invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          invitedAt: new Date().toISOString(),
        };
        setMembers((prev) => [optimisticMember, ...prev]);

        // Reset and close modal
        setAddFullName("");
        setAddEmail("");
        setAddPhone("");
        setAddRole("member");
        setActiveModal(null);
      }
    });
  };

  // Handle Resend Invitation
  const handleResend = (member: DirectoryMember) => {
    if (!member.invitationId) {
      setNotification({
        type: "error",
        message: "No valid invitation record found for this member.",
      });
      return;
    }

    startTransition(async () => {
      const res = await resendMemberInvitationAction(member.invitationId!);
      if (res.error) {
        setNotification({ type: "error", message: res.error });
      } else {
        setNotification({
          type: "success",
          message: res.message || `Invitation re-dispatched to ${member.email}.`,
        });
        // Update expiration in local state
        setMembers((prev) =>
          prev.map((m) =>
            m.id === member.id
              ? {
                  ...m,
                  invitationExpiresAt: new Date(
                    Date.now() + 7 * 24 * 60 * 60 * 1000
                  ).toISOString(),
                }
              : m
          )
        );
        if (activeModal?.type === "details") {
          setActiveModal(null);
        }
      }
    });
  };

  // Handle Revoke Invitation
  const handleRevokeConfirm = (member: DirectoryMember) => {
    if (!member.invitationId) {
      setNotification({
        type: "error",
        message: "No pending invitation found to revoke.",
      });
      return;
    }

    startTransition(async () => {
      const res = await revokeInvitationAction(member.invitationId!);
      if (res.error) {
        setNotification({ type: "error", message: res.error });
      } else {
        setNotification({
          type: "success",
          message: res.message || `Invitation for ${member.email} has been revoked.`,
        });
        setMembers((prev) =>
          prev.map((m) =>
            m.id === member.id
              ? {
                  ...m,
                  status: "deactivated",
                  invitationStatus: "revoked",
                  deactivatedAt: new Date().toISOString(),
                }
              : m
          )
        );
        setActiveModal(null);
      }
    });
  };

  // Handle Reset Access
  const handleResetAccessConfirm = (member: DirectoryMember) => {
    startTransition(async () => {
      const res = await resetAccessAction(member.id);
      if (res.error) {
        setNotification({ type: "error", message: res.error });
      } else {
        setNotification({
          type: "success",
          message: res.message || `Password recovery email sent to ${member.email}.`,
        });
        setActiveModal(null);
      }
    });
  };

  // Handle Deactivate Member
  const handleDeactivateConfirm = (member: DirectoryMember) => {
    startTransition(async () => {
      const res = await deactivateMemberAction(member.id);
      if (res.error) {
        setNotification({ type: "error", message: res.error });
      } else {
        setNotification({
          type: "success",
          message: res.message || `Account for ${member.fullName} has been deactivated.`,
        });
        setMembers((prev) =>
          prev.map((m) =>
            m.id === member.id
              ? {
                  ...m,
                  status: "deactivated",
                  deactivatedAt: new Date().toISOString(),
                }
              : m
          )
        );
        setActiveModal(null);
      }
    });
  };

  // Handle Reactivate Member
  const handleReactivateConfirm = (member: DirectoryMember) => {
    startTransition(async () => {
      const res = await reactivateMemberAction(member.id);
      if (res.error) {
        setNotification({ type: "error", message: res.error });
      } else {
        setNotification({
          type: "success",
          message: res.message || `Account for ${member.fullName} has been reactivated.`,
        });
        setMembers((prev) =>
          prev.map((m) =>
            m.id === member.id
              ? {
                  ...m,
                  status: "active",
                  deactivatedAt: null,
                }
              : m
          )
        );
        setActiveModal(null);
      }
    });
  };

  // Helper formatting dates
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Render role badge with clean styling
  const renderRoleBadge = (role: string) => {
    switch (role) {
      case "main_head":
        return <StatusBadge variant="active" size="sm">MAIN HEAD</StatusBadge>;
      case "group_head":
        return <StatusBadge variant="group" size="sm">GROUP HEAD</StatusBadge>;
      default:
        return <StatusBadge variant="neutral" size="sm">MEMBER</StatusBadge>;
    }
  };

  // Render account status indicator
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <StatusBadge variant="success" size="sm">Active</StatusBadge>;
      case "pending_activation":
        return <StatusBadge variant="pending" size="sm">Pending Activation</StatusBadge>;
      case "deactivated":
        return <StatusBadge variant="error" size="sm">Deactivated</StatusBadge>;
      default:
        return <StatusBadge variant="neutral" size="sm">{status}</StatusBadge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Banner / Notification */}
      {notification && (
        <div
          role="status"
          className={`p-3.5 rounded border text-body-sm flex items-center justify-between gap-3 ${
            notification.type === "success"
              ? "bg-surface-container text-primary border-primary/30"
              : "bg-error-container text-on-error-container border-error/30"
          }`}
        >
          <span className="font-medium">{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs uppercase font-mono px-2 py-0.5 rounded hover:bg-black/5"
            aria-label="Dismiss notification"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <LabelCaps className="text-primary font-bold">Administration & Registry</LabelCaps>
            <span className="text-outline-variant">•</span>
            <StatusBadge variant="active" size="sm">MAIN HEAD EXCLUSIVE</StatusBadge>
          </div>
          <HeadlineMd>Member & Account Management</HeadlineMd>
          <BodyMd className="text-secondary">
            Master institutional directory for {organizationName}. Provision roles, assign primary groups, and manage account lifecycle states.
          </BodyMd>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setAddFormError(null);
              setActiveModal({ type: "add" });
            }}
          >
            + Add Member
          </Button>
        </div>
      </div>

      {/* Institutional Policy Banner */}
      <div className="p-4 rounded bg-surface-container-low border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-label-code-sm text-primary font-semibold">
            MEMBER RULE: EXACTLY ONE PRIMARY GROUP
          </span>
          <span className="text-body-sm text-secondary">
            Every user is bound to a single primary functional group. Cross-group directives are coordinated explicitly via task-level collaboration.
          </span>
        </div>
        <StatusBadge variant="neutral" size="sm">AUTHORITY ENFORCED</StatusBadge>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded bg-surface-container-lowest border border-outline-variant flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="role-filter" className="text-label-caps uppercase text-secondary font-semibold text-[10px]">
              Role:
            </label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 px-2.5 rounded bg-surface-container-low border border-outline-variant text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Roles</option>
              <option value="main_head">Main Head</option>
              <option value="group_head">Group Head</option>
              <option value="member">Member</option>
            </select>
          </div>

          {/* Group Filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="group-filter" className="text-label-caps uppercase text-secondary font-semibold text-[10px]">
              Group:
            </label>
            <select
              id="group-filter"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="h-9 px-2.5 rounded bg-surface-container-low border border-outline-variant text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Groups</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="status-filter" className="text-label-caps uppercase text-secondary font-semibold text-[10px]">
              Status:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-2.5 rounded bg-surface-container-low border border-outline-variant text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending_activation">Pending</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>

          <div className="h-6 w-[1px] bg-outline-variant hidden sm:block mx-1" />

          <span className="font-mono text-label-code-xs text-secondary whitespace-nowrap">
            {filteredMembers.length} {filteredMembers.length === 1 ? "account" : "accounts"}
          </span>
        </div>
      </div>

      {/* Desktop Ledger Table */}
      <div className="hidden md:block rounded bg-surface-container-lowest border border-outline-variant overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low text-secondary text-[11px] font-semibold uppercase tracking-wider font-sans select-none">
              <th className="py-3 px-4">Member Name & Contact</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Primary Group</th>
              <th className="py-3 px-4">Account Status</th>
              <th className="py-3 px-4">Joined / Invited</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60 font-sans">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-secondary">
                  <div className="flex flex-col items-center gap-2">
                    <LabelCode size="md">NO MATCHING ACCOUNTS</LabelCode>
                    <span className="text-body-sm">
                      No institutional members found matching the specified filters.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => {
                const isCurrentUser = member.userId === currentUserId;

                return (
                  <tr
                    key={member.id}
                    className="hover:bg-surface-container-low/50 transition-colors"
                  >
                    {/* Name & Contact */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-body-md font-medium text-on-surface">
                          {member.fullName}
                          {isCurrentUser && (
                            <span className="ml-2 font-mono text-[10px] text-primary bg-primary/10 px-1 py-0.5 rounded">
                              YOU
                            </span>
                          )}
                        </span>
                        <span className="text-body-sm text-secondary font-mono text-[11px]">
                          {member.email}
                          {member.phone && ` • ${member.phone}`}
                        </span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      {renderRoleBadge(member.role)}
                    </td>

                    {/* Primary Group */}
                    <td className="py-3 px-4">
                      <span className="text-body-sm text-on-surface font-medium">
                        {member.primaryGroupName || "Institutional (Org-level)"}
                      </span>
                    </td>

                    {/* Account Status */}
                    <td className="py-3 px-4">
                      {renderStatusBadge(member.status)}
                    </td>

                    {/* Joined / Invited Date */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col text-[11px] font-mono text-secondary">
                        <span>{formatDate(member.joinedAt)}</span>
                        {member.status === "pending_activation" && member.invitationExpiresAt && (
                          <span className="text-[10px] text-secondary/70">
                            Expires: {formatDate(member.invitationExpiresAt)}
                          </span>
                        )}
                        {member.status === "deactivated" && member.deactivatedAt && (
                          <span className="text-[10px] text-error/80">
                            Deactivated: {formatDate(member.deactivatedAt)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Contextual Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveModal({ type: "details", member })}
                        >
                          Details
                        </Button>

                        {/* Pending State Actions */}
                        {member.status === "pending_activation" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isPending}
                              onClick={() => handleResend(member)}
                              title="Resend activation email link"
                            >
                              Resend
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-error hover:text-error hover:bg-error-container/20"
                              onClick={() => setActiveModal({ type: "revoke", member })}
                              title="Revoke pending activation link"
                            >
                              Revoke
                            </Button>
                          </>
                        )}

                        {/* Active State Actions */}
                        {member.status === "active" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isPending}
                              onClick={() => setActiveModal({ type: "reset_access", member })}
                              title="Trigger secure password recovery dispatch"
                            >
                              Reset
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isCurrentUser || isPending}
                              className="text-error hover:text-error hover:bg-error-container/20 disabled:opacity-30"
                              onClick={() => setActiveModal({ type: "deactivate", member })}
                              title={
                                isCurrentUser
                                  ? "Cannot deactivate your own Main Head session"
                                  : "Deactivate account and revoke workspace access"
                              }
                            >
                              Deactivate
                            </Button>
                          </>
                        )}

                        {/* Deactivated State Actions */}
                        {member.status === "deactivated" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            className="text-primary border-primary/30 hover:bg-primary/5"
                            onClick={() => setActiveModal({ type: "reactivate", member })}
                            title="Restore active workspace membership"
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card / Row Presentation */}
      <div className="md:hidden flex flex-col gap-3">
        {filteredMembers.length === 0 ? (
          <div className="p-8 text-center rounded bg-surface-container-lowest border border-outline-variant text-secondary">
            <LabelCode size="sm">NO MATCHING ACCOUNTS</LabelCode>
          </div>
        ) : (
          filteredMembers.map((member) => {
            const isCurrentUser = member.userId === currentUserId;

            return (
              <div
                key={member.id}
                className="p-4 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-body-md font-medium text-on-surface">
                      {member.fullName}
                      {isCurrentUser && (
                        <span className="ml-2 font-mono text-[10px] text-primary bg-primary/10 px-1 py-0.5 rounded">
                          YOU
                        </span>
                      )}
                    </span>
                    <span className="text-body-sm text-secondary font-mono text-[11px]">
                      {member.email}
                    </span>
                  </div>
                  {renderStatusBadge(member.status)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-body-sm py-2 border-y border-outline-variant/40">
                  <div>
                    <span className="text-secondary text-[11px] uppercase block">Role</span>
                    {renderRoleBadge(member.role)}
                  </div>
                  <div>
                    <span className="text-secondary text-[11px] uppercase block">Group</span>
                    <span className="text-on-surface font-medium text-body-sm">
                      {member.primaryGroupName || "Institutional"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-secondary">
                  <span>Joined: {formatDate(member.joinedAt)}</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveModal({ type: "details", member })}
                    >
                      Details
                    </Button>

                    {member.status === "pending_activation" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleResend(member)}
                      >
                        Resend
                      </Button>
                    )}

                    {member.status === "active" && !isCurrentUser && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-error"
                        onClick={() => setActiveModal({ type: "deactivate", member })}
                      >
                        Deactivate
                      </Button>
                    )}

                    {member.status === "deactivated" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveModal({ type: "reactivate", member })}
                      >
                        Reactivate
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* ADD MEMBER / GROUP HEAD DRAWER / MODAL */}
      {/* ========================================================================= */}
      {activeModal?.type === "add" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-member-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg max-w-lg w-full p-6 shadow-xl flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-outline-variant">
              <div className="flex flex-col gap-0.5">
                <LabelCaps className="text-primary font-bold">Institutional Provisioning</LabelCaps>
                <HeadlineMd id="add-member-title">Add Member or Group Head</HeadlineMd>
                <BodyMd className="text-secondary text-body-sm">
                  Issues a controlled Supabase Auth invitation email bound to {organizationName}.
                </BodyMd>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-secondary hover:text-on-surface p-1 rounded hover:bg-surface-container"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {addFormError && (
              <div className="p-3 rounded bg-error-container text-on-error-container text-body-sm font-medium border border-error/20">
                {addFormError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
              <Input
                label="Full Name"
                placeholder="e.g. Maya Chen"
                value={addFullName}
                onChange={(e) => setAddFullName(e.target.value)}
                required
              />

              <Input
                label="Institutional Email"
                type="email"
                placeholder="e.g. member@tinkershub.org"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                required
              />

              <Input
                label="Mobile / WhatsApp Number (Optional)"
                type="tel"
                placeholder="+91 9876543210"
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                hint="Used for critical operational directives and WhatsApp task communication."
              />

              {/* Role Selector: Strictly Member or Group Head only */}
              <div className="flex flex-col gap-1 w-full text-left">
                <label htmlFor="modal-role" className="font-sans text-label-caps uppercase text-secondary font-semibold">
                  Organizational Role
                </label>
                <select
                  id="modal-role"
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as "member" | "group_head")}
                  className="w-full h-9 px-3 rounded bg-surface-container-lowest border border-outline-variant text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="member">Member — Group functional contributor</option>
                  <option value="group_head">Group Head — Functional division lead</option>
                </select>
                <span className="font-sans text-[11px] text-secondary leading-tight">
                  Main Head accounts cannot be provisioned through this interface.
                </span>
              </div>

              {/* Primary Group Selector: Groups belonging to caller's org */}
              <div className="flex flex-col gap-1 w-full text-left">
                <label htmlFor="modal-group" className="font-sans text-label-caps uppercase text-secondary font-semibold">
                  Primary Functional Group
                </label>
                <select
                  id="modal-group"
                  value={addGroupId}
                  onChange={(e) => setAddGroupId(e.target.value)}
                  className="w-full h-9 px-3 rounded bg-surface-container-lowest border border-outline-variant text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} {group.description ? `(${group.description})` : ""}
                    </option>
                  ))}
                </select>
                <span className="font-sans text-[11px] text-secondary leading-tight">
                  Member rule: strictly one primary group per individual.
                </span>
              </div>

              <div className="pt-4 border-t border-outline-variant flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setActiveModal(null)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  isLoading={isPending}
                >
                  Dispatch Invitation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MEMBER DETAILS DRAWER */}
      {/* ========================================================================= */}
      {activeModal?.type === "details" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-details-title"
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm"
        >
          <div className="bg-surface-container-lowest border-l border-outline-variant h-full w-full max-w-md p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="flex flex-col gap-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-outline-variant">
                <div className="flex flex-col gap-1">
                  <LabelCaps className="text-primary font-bold">Account Registry</LabelCaps>
                  <HeadlineMd id="member-details-title">{activeModal.member.fullName}</HeadlineMd>
                  <div className="flex items-center gap-2 mt-1">
                    {renderRoleBadge(activeModal.member.role)}
                    {renderStatusBadge(activeModal.member.status)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="text-secondary hover:text-on-surface p-1 rounded hover:bg-surface-container"
                  aria-label="Close details"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-4 font-sans text-body-sm">
                <div>
                  <span className="text-label-caps uppercase text-secondary font-semibold block text-[10px]">
                    Institutional Email
                  </span>
                  <span className="font-mono text-body-md text-on-surface select-all">
                    {activeModal.member.email}
                  </span>
                </div>

                <div>
                  <span className="text-label-caps uppercase text-secondary font-semibold block text-[10px]">
                    Mobile / WhatsApp Contact
                  </span>
                  <span className="font-mono text-body-md text-on-surface">
                    {activeModal.member.phone || "Not recorded"}
                  </span>
                </div>

                <div>
                  <span className="text-label-caps uppercase text-secondary font-semibold block text-[10px]">
                    Organization
                  </span>
                  <span className="text-on-surface font-medium">
                    {organizationName}
                  </span>
                </div>

                <div>
                  <span className="text-label-caps uppercase text-secondary font-semibold block text-[10px]">
                    Primary Functional Group
                  </span>
                  <span className="text-on-surface font-medium">
                    {activeModal.member.primaryGroupName || "Institutional Scope"}
                  </span>
                </div>

                <div>
                  <span className="text-label-caps uppercase text-secondary font-semibold block text-[10px]">
                    Membership State
                  </span>
                  <span className="font-mono text-[12px] uppercase text-secondary">
                    {activeModal.member.status}
                  </span>
                </div>

                <div>
                  <span className="text-label-caps uppercase text-secondary font-semibold block text-[10px]">
                    Record Created / Joined
                  </span>
                  <span className="font-mono text-secondary text-[12px]">
                    {formatDate(activeModal.member.joinedAt)}
                  </span>
                </div>

                {activeModal.member.status === "pending_activation" && (
                  <div className="p-3 rounded bg-surface-container-low border border-outline-variant flex flex-col gap-2">
                    <span className="font-mono text-[11px] text-primary font-semibold">
                      PENDING ACTIVATION LIFECYCLE
                    </span>
                    <div className="text-[11px] font-mono text-secondary flex flex-col gap-1">
                      <span>Invited: {formatDate(activeModal.member.invitedAt)}</span>
                      <span>Expires: {formatDate(activeModal.member.invitationExpiresAt)}</span>
                    </div>
                  </div>
                )}

                {activeModal.member.status === "deactivated" && (
                  <div className="p-3 rounded bg-error-container/20 border border-error/20 flex flex-col gap-1">
                    <span className="font-mono text-[11px] text-error font-semibold">
                      ACCOUNT DEACTIVATED
                    </span>
                    <span className="text-[11px] font-mono text-secondary">
                      Deactivated: {formatDate(activeModal.member.deactivatedAt)}
                    </span>
                    <span className="text-[11px] text-secondary mt-1">
                      Workspace authentication is blocked. Historical tasks and comments are preserved.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-outline-variant flex flex-col gap-2">
              {activeModal.member.status === "pending_activation" && (
                <>
                  <Button
                    variant="outline"
                    size="md"
                    disabled={isPending}
                    onClick={() => handleResend(activeModal.member)}
                  >
                    Resend Activation Email
                  </Button>
                  <Button
                    variant="danger"
                    size="md"
                    disabled={isPending}
                    onClick={() =>
                      setActiveModal({ type: "revoke", member: activeModal.member })
                    }
                  >
                    Revoke Invitation
                  </Button>
                </>
              )}

              {activeModal.member.status === "active" && (
                <>
                  <Button
                    variant="outline"
                    size="md"
                    disabled={isPending}
                    onClick={() =>
                      setActiveModal({ type: "reset_access", member: activeModal.member })
                    }
                  >
                    Send Password Reset Link
                  </Button>
                  {activeModal.member.userId !== currentUserId && (
                    <Button
                      variant="danger"
                      size="md"
                      disabled={isPending}
                      onClick={() =>
                        setActiveModal({ type: "deactivate", member: activeModal.member })
                      }
                    >
                      Deactivate Account
                    </Button>
                  )}
                </>
              )}

              {activeModal.member.status === "deactivated" && (
                <Button
                  variant="primary"
                  size="md"
                  disabled={isPending}
                  onClick={() =>
                    setActiveModal({ type: "reactivate", member: activeModal.member })
                  }
                >
                  Reactivate Account
                </Button>
              )}

              <Button
                variant="ghost"
                size="md"
                onClick={() => setActiveModal(null)}
              >
                Close Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION: DEACTIVATE MEMBER */}
      {/* ========================================================================= */}
      {activeModal?.type === "deactivate" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivate-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <LabelCaps className="text-error font-bold">Security Action</LabelCaps>
              <HeadlineMd id="deactivate-dialog-title" className="text-on-surface">Deactivate Member Account</HeadlineMd>
            </div>

            <BodyMd className="text-secondary text-body-sm leading-relaxed">
              Are you sure you want to deactivate <strong className="text-on-surface">{activeModal.member.fullName}</strong> ({activeModal.member.email})?
            </BodyMd>

            <div className="p-3 rounded bg-surface-container-low border border-outline-variant text-[11px] font-mono text-secondary">
              • Access to all private workspaces will be immediately revoked.<br />
              • Historical task contributions, comments, and audit trails remain permanently intact.<br />
              • Account can be reactivated at any time by a Main Head.
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
              <Button
                variant="outline"
                size="md"
                disabled={isPending}
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                isLoading={isPending}
                onClick={() => handleDeactivateConfirm(activeModal.member)}
              >
                Confirm Deactivation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION: REACTIVATE MEMBER */}
      {/* ========================================================================= */}
      {activeModal?.type === "reactivate" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reactivate-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <LabelCaps className="text-primary font-bold">Account Restoration</LabelCaps>
              <HeadlineMd id="reactivate-dialog-title" className="text-on-surface">Reactivate Member Account</HeadlineMd>
            </div>

            <BodyMd className="text-secondary text-body-sm leading-relaxed">
              Restore active workspace access for <strong className="text-on-surface">{activeModal.member.fullName}</strong> ({activeModal.member.email})?
            </BodyMd>

            <div className="p-3 rounded bg-surface-container-low border border-outline-variant text-[11px] font-mono text-secondary">
              • Previous role ({activeModal.member.role}) will be preserved.<br />
              • Primary group ({activeModal.member.primaryGroupName || "Institutional"}) will be restored.<br />
              • The user may resume signing in using their existing credentials.
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
              <Button
                variant="outline"
                size="md"
                disabled={isPending}
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={isPending}
                onClick={() => handleReactivateConfirm(activeModal.member)}
              >
                Confirm Reactivation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION: REVOKE INVITATION */}
      {/* ========================================================================= */}
      {activeModal?.type === "revoke" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <LabelCaps className="text-error font-bold">Revocation Notice</LabelCaps>
              <HeadlineMd id="revoke-dialog-title" className="text-on-surface">Revoke Pending Invitation</HeadlineMd>
            </div>

            <BodyMd className="text-secondary text-body-sm leading-relaxed">
              Are you sure you want to revoke the activation invitation for <strong className="text-on-surface">{activeModal.member.email}</strong>?
            </BodyMd>

            <div className="p-3 rounded bg-surface-container-low border border-outline-variant text-[11px] font-mono text-secondary">
              • The sent email activation link will be immediately rendered invalid.<br />
              • The user will not be able to set a password or access the workspace.<br />
              • Historical audit record of this invitation will be preserved.
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
              <Button
                variant="outline"
                size="md"
                disabled={isPending}
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                isLoading={isPending}
                onClick={() => handleRevokeConfirm(activeModal.member)}
              >
                Confirm Revocation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION: RESET ACCESS */}
      {/* ========================================================================= */}
      {activeModal?.type === "reset_access" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <LabelCaps className="text-primary font-bold">Credential Recovery</LabelCaps>
              <HeadlineMd id="reset-dialog-title" className="text-on-surface">Reset Member Access</HeadlineMd>
            </div>

            <BodyMd className="text-secondary text-body-sm leading-relaxed">
              Dispatch a secure password reset link to <strong className="text-on-surface">{activeModal.member.fullName}</strong> at <strong className="text-on-surface">{activeModal.member.email}</strong>?
            </BodyMd>

            <div className="p-3 rounded bg-surface-container-low border border-outline-variant text-[11px] font-mono text-secondary">
              • Supabase Auth will email a password reset link directly to the member.<br />
              • No credentials or temporary passwords will be displayed or stored.<br />
              • Member role ({activeModal.member.role}) and group will remain unaffected.
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
              <Button
                variant="outline"
                size="md"
                disabled={isPending}
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={isPending}
                onClick={() => handleResetAccessConfirm(activeModal.member)}
              >
                Dispatch Reset Link
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
