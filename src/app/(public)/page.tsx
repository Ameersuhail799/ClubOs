import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { Display, BodyLg, LabelCaps, LabelCode } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <div className="py-12 md:py-20 flex flex-col gap-12">
      <PageContainer>
        <div className="max-w-3xl flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <LabelCaps className="text-primary font-bold">Tinkers Hub</LabelCaps>
            <span className="text-outline-variant">•</span>
            <LabelCode size="sm" className="text-secondary">FOUNDATION SHELL</LabelCode>
          </div>

          <Display className="tracking-tight text-on-background">
            Building a culture of autonomous making, engineering curiosity, and shared ownership.
          </Display>

          <BodyLg className="text-secondary">
            Tinkers Hub is a technical community dedicated to hardware prototyping, open-source engineering, and collaborative student initiatives. ClubOS serves as the institutional management and coordination backbone.
          </BodyLg>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link href="/events">
              <Button variant="primary" size="lg">
                View Events & Workshops
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Sign In to ClubOS
              </Button>
            </Link>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
