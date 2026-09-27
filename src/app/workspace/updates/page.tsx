import React from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodyMd, LabelCaps, LabelCode } from "@/components/ui/Typography";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

export default function UpdatesPage() {
  return (
    <div className="py-8 flex flex-col gap-6">
      <PageContainer>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <LabelCaps className="text-primary font-bold">Group Announcements</LabelCaps>
              <span className="text-outline-variant">•</span>
              <StatusBadge variant="neutral" size="sm">UPDATES</StatusBadge>
            </div>
            <HeadlineMd>Group Updates & Broadcasts</HeadlineMd>
            <BodyMd className="text-secondary">
              Official division announcements and project notices from group leads.
            </BodyMd>
          </div>

          <Link href="/workspace/my-day">
            <Button variant="outline" size="sm">
              ← Back to My Day
            </Button>
          </Link>
        </div>

        <div className="p-8 rounded bg-surface-container-lowest border border-outline-variant text-center flex flex-col items-center justify-center gap-2">
          <LabelCode size="sm" className="text-secondary">
            BROADCAST FEED STANDING BY
          </LabelCode>
          <BodyMd className="text-secondary max-w-md">
            Broadcast messages and announcements from institutional leadership will be displayed here.
          </BodyMd>
        </div>
      </PageContainer>
    </div>
  );
}
