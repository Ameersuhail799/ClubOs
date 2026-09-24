import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodyMd, LabelCaps, LabelCode } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";

export default function EventsArchivePage() {
  return (
    <div className="py-12 flex flex-col gap-8">
      <PageContainer>
        <div className="flex flex-col gap-2 pb-6 border-b border-outline-variant">
          <LabelCaps>Public Portal</LabelCaps>
          <HeadlineMd>Events & Workshops Archive</HeadlineMd>
          <BodyMd className="text-secondary max-w-2xl">
            Technical symposiums, hardware build primers, and collaborative engineering sessions organized by Tinkers Hub.
          </BodyMd>
        </div>

        <div className="py-12 text-center flex flex-col items-center gap-4">
          <LabelCode size="md" className="text-secondary">
            EVENTS ARCHIVE LEDGER
          </LabelCode>
          <BodyMd className="text-secondary max-w-md">
            Event schedules, agendas, and technical documentation will be populated as community initiatives are published through the Event division.
          </BodyMd>
          <div className="pt-2">
            <Link href="/events/maker-conclave">
              <Button variant="outline" size="sm">
                Sample Event Specification (Slug Route) →
              </Button>
            </Link>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
