import React from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodyMd, LabelCaps, LabelCode } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = await params;

  return (
    <div className="py-12 flex flex-col gap-8">
      <PageContainer>
        <div className="flex flex-col gap-2 pb-6 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <Link href="/events" className="text-body-sm text-secondary hover:text-on-surface">
              ← Events Archive
            </Link>
            <span className="text-outline-variant">•</span>
            <LabelCode size="sm">{slug}</LabelCode>
          </div>
          <HeadlineMd className="capitalize">
            {slug.replace(/-/g, " ")}
          </HeadlineMd>
          <BodyMd className="text-secondary max-w-2xl">
            Detailed technical overview, three-day agenda schedule, workbench prerequisites, and registration details.
          </BodyMd>
        </div>

        <div className="py-12 text-center flex flex-col items-center gap-4">
          <LabelCaps>Event Specification Route</LabelCaps>
          <BodyMd className="text-secondary max-w-md">
            This route boundary receives published event records from the Event functional division.
          </BodyMd>
          <div className="pt-2">
            <Link href="/events">
              <Button variant="secondary" size="sm">
                Back to All Events
              </Button>
            </Link>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
