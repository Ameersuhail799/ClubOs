import React from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, HeadlineSm, BodyMd, BodySm, LabelCaps, LabelCode } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getPublicEvents } from "@/lib/content/service";

export const dynamic = "force-dynamic";

interface EventsPageProps {
  searchParams: Promise<{
    tab?: "upcoming" | "archive" | "all";
    search?: string;
  }>;
}

export default async function EventsArchivePage({ searchParams }: EventsPageProps) {
  const { tab = "upcoming", search = "" } = await searchParams;

  const { organization, events } = await getPublicEvents({
    tab,
    search,
  });

  const orgName = organization?.name || "Tinkers Hub";

  return (
    <div className="py-12 flex flex-col gap-8">
      <PageContainer>
        {/* Page Header */}
        <div className="flex flex-col gap-2 pb-6 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <LabelCaps className="text-primary font-bold">Public Portal</LabelCaps>
            <span className="text-outline-variant">•</span>
            <LabelCode size="sm" className="text-secondary font-mono">
              {orgName.toUpperCase()}
            </LabelCode>
          </div>
          <HeadlineMd>Events & Technical Build Primers</HeadlineMd>
          <BodyMd className="text-secondary max-w-2xl">
            Hands-on technical primers, hardware prototyping sessions, and collaborative symposiums organized by {orgName}.
          </BodyMd>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          {/* Tab Switcher */}
          <div className="flex items-center gap-2 border-b sm:border-b-0 border-outline-variant pb-2 sm:pb-0 overflow-x-auto">
            <Link href="/events?tab=upcoming">
              <button
                type="button"
                className={`px-3.5 py-1.5 rounded text-body-sm font-semibold transition-colors ${
                  tab === "upcoming"
                    ? "bg-primary text-on-primary"
                    : "text-secondary hover:text-on-surface hover:bg-surface-container"
                }`}
              >
                Upcoming Workshops
              </button>
            </Link>
            <Link href="/events?tab=archive">
              <button
                type="button"
                className={`px-3.5 py-1.5 rounded text-body-sm font-semibold transition-colors ${
                  tab === "archive"
                    ? "bg-primary text-on-primary"
                    : "text-secondary hover:text-on-surface hover:bg-surface-container"
                }`}
              >
                Past Event Archive
              </button>
            </Link>
            <Link href="/events?tab=all">
              <button
                type="button"
                className={`px-3.5 py-1.5 rounded text-body-sm font-semibold transition-colors ${
                  tab === "all"
                    ? "bg-primary text-on-primary"
                    : "text-secondary hover:text-on-surface hover:bg-surface-container"
                }`}
              >
                All Records
              </button>
            </Link>
          </div>

          {/* Search Box */}
          <form method="GET" action="/events" className="flex items-center gap-2">
            <input type="hidden" name="tab" value={tab} />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search by topic or keyword..."
              className="p-2 rounded border border-outline-variant bg-surface text-on-surface text-body-sm focus:outline-none focus:border-primary w-64"
            />
            <Button type="submit" variant="outline" size="sm">
              Filter
            </Button>
          </form>
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="py-16 text-center rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest flex flex-col items-center gap-3">
            <LabelCaps>No Matching Events Found</LabelCaps>
            <BodyMd className="text-secondary max-w-md">
              {search
                ? `No events matching "${search}" were found in the ${tab} ledger.`
                : `There are currently no events listed under the ${tab} archive.`}
            </BodyMd>
            {search && (
              <Link href={`/events?tab=${tab}`}>
                <Button variant="outline" size="sm">
                  Clear Filter
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="rounded-lg border border-outline-variant bg-surface-container-lowest overflow-hidden flex flex-col justify-between hover:border-primary/50 transition-colors shadow-sm"
              >
                {ev.banner_url ? (
                  <div className="relative h-44 w-full bg-surface-container-low overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ev.banner_url}
                      alt={ev.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-28 w-full bg-surface-container-low border-b border-outline-variant flex items-center justify-center p-4">
                    <LabelCode size="sm" className="text-secondary font-mono">
                      AUTONOMOUS SYMPOSIUM
                    </LabelCode>
                  </div>
                )}

                <div className="p-5 flex flex-col gap-3 flex-1 justify-between">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge
                        variant={ev.status === "published" ? "active" : "group"}
                        size="sm"
                      >
                        {ev.status === "published" ? "ACTIVE" : "ARCHIVED"}
                      </StatusBadge>
                      <span className="text-outline-variant">•</span>
                      <LabelCode size="sm" className="text-secondary font-mono">
                        {new Date(ev.starts_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </LabelCode>
                    </div>

                    <HeadlineSm className="text-on-surface font-sans font-bold">
                      {ev.title}
                    </HeadlineSm>

                    {ev.location && (
                      <span className="text-xs text-secondary truncate">
                        📍 {ev.location}
                      </span>
                    )}

                    {ev.abstract && (
                      <p className="text-body-sm text-secondary line-clamp-2 mt-1">
                        {ev.abstract}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-outline-variant flex items-center justify-between">
                    <span className="text-xs text-secondary font-mono">
                      {new Date(ev.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <Link href={`/events/${ev.slug}`}>
                      <Button variant="outline" size="sm">
                        View Specification →
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
