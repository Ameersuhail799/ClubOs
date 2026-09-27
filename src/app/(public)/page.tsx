import React from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  Display,
  HeadlineMd,
  HeadlineSm,
  BodyLg,
  BodyMd,
  BodySm,
  LabelCaps,
  LabelCode,
} from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getPublicHomeData } from "@/lib/content/service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const {
    organization,
    hero,
    upcomingEvents,
    announcements,
    programs,
    gallery,
    about,
  } = await getPublicHomeData();

  const orgName = organization?.name || "Tinkers Hub";
  const heroTitle =
    hero?.title ||
    "Building a culture of autonomous making, engineering curiosity, and shared ownership.";
  const heroSummary =
    hero?.summary ||
    "Tinkers Hub is a technical community dedicated to hardware prototyping, open-source engineering, and collaborative student initiatives. ClubOS serves as the institutional management and coordination backbone.";

  // Default programs if none curated yet
  const defaultPrograms = [
    {
      title: "Engineering & Prototyping",
      badge: "HARDWARE LAB",
      summary:
        "Embedded systems, robotics, firmware development, PCB design, and mechanical prototyping.",
    },
    {
      title: "Events & Symposiums",
      badge: "KNOWLEDGE TRANSFER",
      summary:
        "Hackathons, technical build primers, engineering masterclasses, and hands-on workshops.",
    },
    {
      title: "Open Source & Documentation",
      badge: "SOFTWARE REPOSITORIES",
      summary:
        "Public software repositories, dev tooling, algorithmic primitives, and open hardware schemas.",
    },
    {
      title: "Outreach & Community",
      badge: "COLLABORATION",
      summary:
        "Peer mentorship, inter-collegiate engineering hackathons, and secondary school STEM primers.",
    },
    {
      title: "Operations & Workbench Management",
      badge: "LAB INFRASTRUCTURE",
      summary:
        "Tool inventory, soldering station maintenance, component logistics, and safety protocols.",
    },
  ];

  const displayedPrograms =
    programs && programs.length > 0
      ? programs.map((p) => ({
          title: p.title,
          badge: (p.metadata as any)?.badge || "CORE TRACK",
          summary: p.summary || "",
        }))
      : defaultPrograms;

  // Default gallery if none curated yet
  const defaultGallery = [
    {
      title: "Hardware Prototyping Workbench",
      media_url:
        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
      year: "2026",
      tag: "ENGINEERING",
      caption: "Collaborative embedded systems testing and oscilloscope telemetry analysis.",
    },
    {
      title: "Microcontroller Soldering Primer",
      media_url:
        "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=800&q=80",
      year: "2026",
      tag: "WORKSHOP",
      caption: "Surface-mount component soldering on custom 4-layer student breakout boards.",
    },
    {
      title: "Maker Conclave Hackathon Floor",
      media_url:
        "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80",
      year: "2026",
      tag: "SYMPOSIUM",
      caption: "Forty-eight hours of continuous prototyping, peer code review, and hardware demos.",
    },
  ];

  const displayedGallery =
    gallery && gallery.length > 0
      ? gallery.map((g) => ({
          title: g.title,
          media_url: g.media_url || "",
          year: (g.metadata as any)?.year || "2026",
          tag: (g.metadata as any)?.tag || "WORKSHOP",
          caption: g.summary || "",
        }))
      : defaultGallery;

  return (
    <div className="flex flex-col">
      {/* 1. PUBLIC ANNOUNCEMENTS TICKER */}
      {announcements && announcements.length > 0 && (
        <aside aria-label="Official Announcements" className="w-full bg-surface-container-high border-b border-outline-variant py-2.5 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono uppercase bg-primary text-on-primary shrink-0">
                BROADCAST
              </span>
              <p className="text-body-sm font-medium text-on-surface truncate">
                <span className="font-bold">{announcements[0].title}:</span>{" "}
                {announcements[0].content}
              </p>
            </div>
            <Link
              href="/events"
              className="text-xs text-primary font-semibold hover:underline shrink-0 hidden sm:inline"
            >
              Learn More →
            </Link>
          </div>
        </aside>
      )}

      {/* 2. EDITORIAL HERO SECTION */}
      <section className="py-16 md:py-24 border-b border-outline-variant bg-surface">
        <PageContainer>
          <div className="max-w-4xl flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <LabelCaps className="text-primary font-bold">{orgName}</LabelCaps>
              <span className="text-outline-variant">•</span>
              <LabelCode size="sm" className="text-secondary font-mono">
                AUTONOMOUS MAKERSPACE
              </LabelCode>
            </div>

            <Display className="tracking-tight text-on-background font-sans font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight">
              {heroTitle}
            </Display>

            <BodyLg className="text-secondary max-w-2xl text-base sm:text-lg">
              {heroSummary}
            </BodyLg>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <Link href="/events">
                <Button variant="primary" size="lg">
                  View Events & Workshops
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Sign In to ClubOS
                </Button>
              </Link>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* 3. UPCOMING FLAGSHIP EVENTS SECTION */}
      <section className="py-16 border-b border-outline-variant bg-surface-container-lowest">
        <PageContainer>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-outline-variant mb-8">
            <div className="flex flex-col gap-1">
              <LabelCaps className="text-primary font-bold">Upcoming Symposiums</LabelCaps>
              <HeadlineMd>Events & Technical Build Primers</HeadlineMd>
              <BodySm className="text-secondary">
                Hands-on technical primers and hardware build sessions scheduled for the coming weeks.
              </BodySm>
            </div>
            <Link href="/events">
              <Button variant="outline" size="sm">
                View Full Archive →
              </Button>
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="p-12 text-center rounded-lg border border-dashed border-outline-variant bg-surface flex flex-col items-center gap-3">
              <LabelCaps>No Active Public Events</LabelCaps>
              <BodyMd className="text-secondary max-w-md">
                All upcoming events are currently being finalized. Browse our historical symposium records in the archive.
              </BodyMd>
              <Link href="/events">
                <Button variant="secondary" size="sm">
                  Explore Past Event Archive
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-lg border border-outline-variant bg-surface overflow-hidden flex flex-col justify-between hover:border-primary/50 transition-colors shadow-sm"
                >
                  {ev.banner_url && (
                    <div className="relative h-44 w-full bg-surface-container-low overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ev.banner_url}
                        alt={ev.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6 flex flex-col gap-3 flex-1 justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge variant="active" size="sm">
                          UPCOMING
                        </StatusBadge>
                        <span className="text-outline-variant">•</span>
                        <LabelCode size="sm" className="text-secondary font-mono">
                          {new Date(ev.starts_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </LabelCode>
                        {ev.location && (
                          <>
                            <span className="text-outline-variant">•</span>
                            <span className="text-xs text-secondary truncate max-w-[200px]">
                              📍 {ev.location}
                            </span>
                          </>
                        )}
                      </div>
                      <HeadlineSm className="text-on-surface font-sans font-bold">
                        {ev.title}
                      </HeadlineSm>
                      {ev.abstract && (
                        <p className="text-body-sm text-secondary line-clamp-2">
                          {ev.abstract}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-outline-variant flex items-center justify-between">
                      <span className="text-xs text-secondary font-mono">
                        {new Date(ev.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
      </section>

      {/* 4. PROGRAM DIVISIONS SHOWCASE */}
      <section id="programs" className="py-16 border-b border-outline-variant bg-surface">
        <PageContainer>
          <div className="flex flex-col gap-1 pb-6 border-b border-outline-variant mb-8">
            <LabelCaps className="text-primary font-bold">Foundational Tracks</LabelCaps>
            <HeadlineMd>Program Divisions</HeadlineMd>
            <BodySm className="text-secondary">
              Core technical and operational divisions driving open engineering at {orgName}.
            </BodySm>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedPrograms.map((prog, idx) => (
              <div
                key={idx}
                className="p-6 rounded-lg bg-surface-container-low border border-outline-variant flex flex-col gap-3 justify-between shadow-sm"
              >
                <div className="flex flex-col gap-2">
                  <LabelCode size="sm" className="text-primary font-bold tracking-wider">
                    {prog.badge}
                  </LabelCode>
                  <HeadlineSm className="text-on-surface font-sans font-bold text-lg">
                    {prog.title}
                  </HeadlineSm>
                  <BodySm className="text-secondary">{prog.summary}</BodySm>
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* 5. AUTHENTIC WORKSHOP GALLERY */}
      <section id="gallery" className="py-16 border-b border-outline-variant bg-surface-container-lowest">
        <PageContainer>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-outline-variant mb-8">
            <div className="flex flex-col gap-1">
              <LabelCaps className="text-primary font-bold">Documentary Ledger</LabelCaps>
              <HeadlineMd>Authentic Workshop Photography</HeadlineMd>
              <BodySm className="text-secondary">
                Documenting live student engineering sessions, hardware builds, and design reviews.
              </BodySm>
            </div>
            <LabelCode size="sm" className="text-secondary font-mono">
              CURATED ARCHIVE
            </LabelCode>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {displayedGallery.map((photo, idx) => (
              <div
                key={idx}
                className="rounded-lg bg-surface border border-outline-variant overflow-hidden flex flex-col shadow-sm"
              >
                <div className="relative h-48 w-full bg-surface-container-low overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.media_url}
                    alt={photo.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-black/60 text-white backdrop-blur-sm">
                      {photo.year}
                    </span>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-1 flex-1 justify-between">
                  <div>
                    <LabelCode size="sm" className="text-primary font-bold">
                      {photo.tag}
                    </LabelCode>
                    <h4 className="font-sans font-bold text-body-md text-on-surface mt-1">
                      {photo.title}
                    </h4>
                    {photo.caption && (
                      <p className="text-body-sm text-secondary line-clamp-2 mt-1">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* 6. ABOUT & INSTITUTIONAL COORDINATES */}
      <section id="about" className="py-16 bg-surface">
        <PageContainer>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 flex flex-col gap-4">
              <LabelCaps className="text-primary font-bold">Institutional Philosophy</LabelCaps>
              <HeadlineMd className="font-sans font-bold">About Tinkers Hub</HeadlineMd>
              <BodyMd className="text-secondary leading-relaxed">
                {about?.body ||
                  "Founded to bridge the chasm between textbook engineering and physical prototyping. Tinkers Hub provides workbench facilities, component repositories, and an autonomous peer-led project hierarchy."}
              </BodyMd>
              <BodySm className="text-secondary leading-relaxed">
                ClubOS acts as the operational nervous system for Tinkers Hub, ensuring complete institutional accountability, role-isolated task delegation, and verified engineering handoffs without administrative drag.
              </BodySm>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-4 p-6 rounded-lg bg-surface-container-low border border-outline-variant">
              <LabelCaps className="text-secondary font-bold">Makerspace Coordinates</LabelCaps>

              <div className="flex flex-col gap-1">
                <span className="text-label-caps text-secondary font-semibold">Physical Facility</span>
                <span className="text-body-sm font-medium text-on-surface">
                  {(about?.metadata as any)?.location || "Engineering Block B, Studio 402, Campus Makerspace"}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-label-caps text-secondary font-semibold">Workbench Hours</span>
                <span className="text-body-sm font-medium text-on-surface">
                  {(about?.metadata as any)?.hours || "Monday - Saturday: 09:00 - 21:00 IST"}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-label-caps text-secondary font-semibold">Institutional Contact</span>
                <span className="text-body-sm font-medium text-on-surface font-mono">
                  {(about?.metadata as any)?.contact || "lead@tinkershub.internal"}
                </span>
              </div>

              <div className="pt-2 border-t border-outline-variant">
                <Link href="/login">
                  <Button variant="secondary" size="sm" className="w-full">
                    Member Access Portal →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
