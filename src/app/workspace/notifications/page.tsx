import React from "react";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodyMd, LabelCaps } from "@/components/ui/Typography";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getCurrentOrganizationContext } from "@/lib/auth/context";
import { getNotifications, getWhatChangedFeed } from "@/lib/notifications/service";
import { NotificationsDualStream } from "@/components/notifications/NotificationsDualStream";

export default async function NotificationsPage() {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user) {
    redirect("/login");
  }

  const [notifsRes, whatChangedRes] = await Promise.all([
    getNotifications(context, { status: "all", limit: 50 }),
    getWhatChangedFeed(context, { limit: 40 }),
  ]);

  const notifications = notifsRes.data || [];
  const whatChanged = whatChangedRes.data || [];

  return (
    <div className="py-8 flex flex-col gap-6">
      <PageContainer>
        {/* Top Context Bar */}
        <div className="flex flex-col gap-1 pb-6 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <LabelCaps className="text-primary font-bold">Workspace Center</LabelCaps>
            <span className="text-outline-variant">•</span>
            <StatusBadge variant="group" size="sm">
              DUAL STREAM
            </StatusBadge>
          </div>
          <HeadlineMd>Notifications & What Changed</HeadlineMd>
          <BodyMd className="text-secondary">
            Separated attention ledger for direct directives/mentions and granular audit ledger for institutional state changes.
          </BodyMd>
        </div>

        {/* Dual Stream Split */}
        <div className="pt-2">
          <NotificationsDualStream
            initialNotifications={notifications}
            initialWhatChanged={whatChanged}
            userRole={context.role}
          />
        </div>
      </PageContainer>
    </div>
  );
}
