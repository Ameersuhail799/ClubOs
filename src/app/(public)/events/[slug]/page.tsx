import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  Display,
  HeadlineMd,
  HeadlineSm,
  BodyMd,
  BodySm,
  LabelCaps,
  LabelCode,
} from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getPublicEventBySlug } from "@/lib/content/service";

export const dynamic = "force-dynamic";

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);

  if (!event) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center gap-4">
        <PageContainer>
          <div className="max-w-md mx-auto flex flex-col items-center gap-4">
            <LabelCaps className="text-secondary font-bold">Event Not Found</LabelCaps>
            <HeadlineMd>Specification Unavailable</HeadlineMd>
            <BodyMd className="text-secondary">
              The requested event specification &quot;{slug}&quot; either does not exist or has not been published for public view.
            </BodyMd>
            <div className="pt-2">
              <Link href="/events">
                <Button variant="primary" size="md">
                  ← Back to Events Archive
                </Button>
              </Link>
            </div>
          </div>
        </PageContainer>
      </div>
    );
  }

  const agendaItems: Array<{ time: string; topic: string }> = Array.isArray(event.agenda)
    ? (event.agenda as any)
    : [];

  const prerequisites: string[] = Array.isArray(event.prerequisites)
    ? (event.prerequisites as any)
    : [];

  const starts = new Date(event.starts_at);
  const ends = new Date(event.ends_at);

  return (
    <div className="py-12 flex flex-col gap-10">
      <PageContainer>
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-body-sm text-secondary pb-4">
          <Link href="/events" className="hover:text-on-surface">
            ← Events & Workshops Archive
          </Link>
          <span className="text-outline-variant">•</span>
          <LabelCode size="sm" className="text-secondary font-mono">
            {event.slug}
          </LabelCode>
        </div>

        {/* Hero & Banner */}
        <div className="flex flex-col gap-6">
          {event.banner_url && (
            <div className="relative h-64 sm:h-80 md:h-96 w-full rounded-lg border border-outline-variant overflow-hidden bg-surface-container-low shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.banner_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex flex-col gap-4 max-w-4xl">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge
                variant={event.status === "published" ? "active" : "group"}
                size="sm"
              >
                {event.status === "published" ? "UPCOMING" : "ARCHIVED RECORD"}
              </StatusBadge>
              <span className="text-outline-variant">•</span>
              <LabelCaps className="text-primary font-bold">
                {event.organization?.name || "Tinkers Hub"}
              </LabelCaps>
            </div>

            <Display className="text-on-surface font-sans font-bold text-2xl sm:text-3xl md:text-4xl">
              {event.title}
            </Display>

            {event.abstract && (
              <p className="text-body-lg text-secondary leading-relaxed text-base sm:text-lg">
                {event.abstract}
              </p>
            )}
          </div>
        </div>

        {/* Two-Column Specification Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-8 border-t border-outline-variant">
          {/* Main Content & Syllabus */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            {event.content && (
              <div className="flex flex-col gap-3">
                <LabelCaps className="text-primary font-bold">Technical Description</LabelCaps>
                <div className="text-body-md text-on-surface leading-relaxed whitespace-pre-line">
                  {event.content}
                </div>
              </div>
            )}

            {/* Agenda Schedule */}
            {agendaItems.length > 0 && (
              <div className="flex flex-col gap-4 pt-4 border-t border-outline-variant">
                <LabelCaps className="text-primary font-bold">Symposium Schedule</LabelCaps>
                <div className="flex flex-col divide-y divide-outline-variant/60 rounded-lg border border-outline-variant bg-surface-container-lowest overflow-hidden">
                  {agendaItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <LabelCode size="sm" className="text-primary font-bold shrink-0">
                        {item.time}
                      </LabelCode>
                      <span className="text-body-sm font-medium text-on-surface flex-1">
                        {item.topic}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prerequisites & Tooling */}
            {prerequisites.length > 0 && (
              <div className="flex flex-col gap-4 pt-4 border-t border-outline-variant">
                <LabelCaps className="text-primary font-bold">Workbench Prerequisites</LabelCaps>
                <div className="p-5 rounded-lg border border-outline-variant bg-surface-container-low flex flex-col gap-2">
                  <BodySm className="text-secondary font-medium">
                    Participants must ensure readiness with the following hardware/software prerequisites:
                  </BodySm>
                  <ul className="flex flex-col gap-2 mt-2">
                    {prerequisites.map((prereq, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-body-sm text-on-surface">
                        <span className="text-primary font-bold">✔</span>
                        <span>{prereq}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Metadata Card */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="p-6 rounded-lg bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col gap-5">
              <LabelCaps className="text-secondary font-bold">Event Specification</LabelCaps>

              <div className="flex flex-col gap-1">
                <span className="text-label-caps text-secondary font-semibold">Date & Schedule</span>
                <span className="text-body-sm font-medium text-on-surface">
                  {starts.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="text-xs text-secondary font-mono">
                  {starts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                  {ends.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              {event.location && (
                <div className="flex flex-col gap-1">
                  <span className="text-label-caps text-secondary font-semibold">Location / Venue</span>
                  <span className="text-body-sm font-medium text-on-surface">
                    📍 {event.location}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-label-caps text-secondary font-semibold">Institutional Status</span>
                <span className="text-body-sm font-medium text-on-surface uppercase">
                  {event.status}
                </span>
              </div>

              <div className="pt-3 border-t border-outline-variant flex flex-col gap-2">
                <Link href="/events">
                  <Button variant="outline" size="sm" className="w-full">
                    ← Back to All Events
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="secondary" size="sm" className="w-full">
                    Member Access Portal
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
