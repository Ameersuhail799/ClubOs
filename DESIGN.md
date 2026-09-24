# ClubOS — Design & Interaction System Specification
**Project:** ClubOS — Tinkers Hub Management Platform  
**Approved Design Reference:** Stitch Project `projects/8117860540905587994`  
**Revision Date:** September 2026  
**Status:** Locked & Approved Visual and Interaction Architecture  

---

## 1. Executive Summary & Design Philosophy

ClubOS is an institutional, editorial-grade operations platform engineered specifically for **Tinkers Hub**. It provides an operational nervous system that coordinates five core functional groups under an uncompromising security and authorization model.

### Core Philosophy: Minimal Surface + Rich Interaction
- **Essential Information First, Details on Demand:** The visual surface is clean, restrained, and calm. Density is unlocked progressively through purposeful interaction rather than decorative clutter.
- **The Task as the Central Interactive Object:** The Task is the gravitational center connecting Main Head → Group Head → Member. It is a persistent shared object with role-dependent actions, deep auditability, and clear lifecycle transitions.
- **Anti-Vibecoding Rule Enforced:**
  - **Forbidden:** Purple AI aesthetics, neon accents, vibrant gradients, glow effects, glassmorphism, liquid glass, emojis in UI chrome, dot-grid backgrounds inside the workspace, floating particles, decorative orbs, gratuitous dropshadows, cartoonish rounded corners (> 8px), bento grid clones, fake metrics/testimonials, rainbow palettes, and simulated terminal windows.
  - **Embraced:** Monospaced data tags, hairline border rules, subtle warm cream/parchment surfaces, deep forest slate greens, crisp typography, razor-sharp alignment, structured data ledgers, and clear status indicators.

---

## 2. Design Tokens & Foundations

### 2.1 Color Palette
The approved Stitch palette uses high-contrast, organic institutional tones based on a muted botanical slate-green primary, warm parchment surfaces, and crisp neutral inks.

```css
:root {
  /* Primary & Brand */
  --color-primary: #153328;              /* Deep Forest Ink */
  --color-primary-container: #2c4a3e;    /* Institutional Slate Green */
  --color-on-primary: #ffffff;
  --color-on-primary-container: #98b9a9;
  --color-primary-fixed: #c8eada;
  --color-primary-fixed-dim: #adcebe;
  --color-on-primary-fixed: #012016;
  --color-on-primary-fixed-variant: #2f4d41;

  /* Secondary & Neutrals */
  --color-secondary: #5d5f5a;            /* Neutral Slate */
  --color-secondary-container: #e2e3dc;  /* Neutral Tint */
  --color-on-secondary: #ffffff;
  --color-on-secondary-container: #636560;
  --color-secondary-fixed: #e2e3dc;
  --color-secondary-fixed-dim: #c6c7c1;
  --color-on-secondary-fixed: #1a1c18;
  --color-on-secondary-fixed-variant: #454743;

  /* Tertiary */
  --color-tertiary: #023522;
  --color-tertiary-container: #1f4c37;
  --color-on-tertiary: #ffffff;
  --color-on-tertiary-container: #8cbca0;
  --color-tertiary-fixed: #bceed1;
  --color-tertiary-fixed-dim: #a1d1b5;
  --color-on-tertiary-fixed: #002113;
  --color-on-tertiary-fixed-variant: #224f3a;

  /* Surfaces & Canvas (Warm Editorial Parchment) */
  --color-background: #fbf9f5;           /* Warm Off-White / Parchment */
  --color-surface: #fbf9f5;
  --color-surface-dim: #dbdad6;
  --color-surface-bright: #fbf9f5;
  --color-surface-container-lowest: #ffffff;  /* Pure Card White */
  --color-surface-container-low: #f5f3f0;     /* Muted Section Fill */
  --color-surface-container: #efeeea;         /* Subdued Card / Ledger */
  --color-surface-container-high: #e9e8e4;    /* Border & Hover Layer */
  --color-surface-container-highest: #e4e2df; /* Inset Element Fill */
  --color-surface-variant: #e4e2df;

  /* Ink & Typography */
  --color-on-background: #1b1c1a;       /* Charcoal Text */
  --color-on-surface: #1b1c1a;
  --color-on-surface-variant: #414845;  /* Secondary Text */
  --color-outline: #727974;             /* Mid Boundary Line */
  --color-outline-variant: #c1c8c3;     /* Subtle Card Border (Hairline) */

  /* Inverted Surfaces */
  --color-inverse-surface: #30312e;
  --color-inverse-on-surface: #f2f1ed;
  --color-inverse-primary: #adcebe;

  /* Semantic Alerts */
  --color-error: #ba1a1a;
  --color-error-container: #ffdad6;
  --color-on-error: #ffffff;
  --color-on-error-container: #93000a;
}
```

### 2.2 Typography System
Typography is strictly dual-family:
1. **Headline & Body:** `Plus Jakarta Sans` (Clean, balanced geometric humanist sans-serif)
2. **Metadata, Badges, Metrics, & Timelines:** `JetBrains Mono` (High-legibility monospace)

| Token | Family | Size | Weight | Line Height | Letter Spacing | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `display-lg` | Plus Jakarta Sans | 32px (2rem) | 600 (SemiBold) | 40px (2.5rem) | `-0.02em` | Public Hero & Landing titles |
| `headline-md` | Plus Jakarta Sans | 24px (1.5rem) | 600 (SemiBold) | 32px (2rem) | `-0.015em` | Workspace Headers & Modal Titles |
| `headline-sm` | Plus Jakarta Sans | 18px (1.125rem) | 600 (SemiBold) | 24px (1.5rem) | `-0.01em` | Section Titles, Card Headers |
| `body-lg` | Plus Jakarta Sans | 15px (0.9375rem) | 400 (Regular) | 24px (1.5rem) | `-0.005em` | Editorial Introductions & Scopes |
| `body-md` | Plus Jakarta Sans | 13px (0.8125rem) | 400 / 500 | 20px (1.25rem) | `0em` | Standard Body, Form Inputs, Task Descriptions |
| `body-sm` | Plus Jakarta Sans | 12px (0.75rem) | 400 / 500 | 18px (1.125rem) | `0em` | Secondary Descriptions & Supporting notes |
| `label-caps` | Plus Jakarta Sans | 11px (0.6875rem) | 600 (SemiBold) | 16px (1rem) | `+0.06em` | Uppercase Section Overlines & Table Column Headers |
| `label-code-md` | JetBrains Mono | 12px (0.75rem) | 500 (Medium) | 16px (1rem) | `-0.01em` | Task IDs, Dates, Hash Indicators, User Roles |
| `label-code-sm` | JetBrains Mono | 11px (0.6875rem) | 400 / 500 | 14px (0.875rem) | `0em` | Micro Timestamps, Audit Commits, Capacity counters |

### 2.3 Spacing & Layout Rhythm
- **Base Grid Unit:** 4px
- **Scale:**
  - `space-xs`: `0.25rem` (4px)
  - `space-sm`: `0.5rem` (8px)
  - `space-md`: `0.75rem` (12px)
  - `space-lg`: `1.25rem` (20px)
  - `space-xl`: `2rem` (32px)
  - `margin`: `1.5rem` (24px)
  - `margin-lg`: `2.5rem` (40px)
  - `gutter`: `1rem` (16px)

### 2.4 Corner Radius & Elevation
- **Corner Radius:** `ROUND_FOUR` (`rounded` = 4px; `rounded-md` = 6px; `rounded-lg` = 8px maximum).
- **Pill Badges:** `rounded-full` reserved solely for compact status chips and tag pills.
- **Borders & Hairlines:** Explicit `1px solid var(--color-outline-variant)` (`#c1c8c3` / `#e4e2df`).
- **Shadows:** Flat architecture. Subtle shadow (`0 1px 3px rgba(0,0,0,0.05)`) only on active dropdowns or modal overlays (`shadow-xl`). No heavy colored glows.

---

## 3. Brand Identity & Visual Assets

### 3.1 SVG Brandmark
Approved institutional brandmark combining a precise compass-mark geometry with the typographic wordmark:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 36" width="160" height="36" fill="none">
  <rect x="2" y="6" width="24" height="24" rx="4" stroke="#2C4A3E" stroke-width="2.5" fill="#EEF2EE"/>
  <circle cx="14" cy="18" r="4" fill="#2C4A3E"/>
  <line x1="14" y1="10" x2="14" y2="14" stroke="#2C4A3E" stroke-width="2" stroke-linecap="round"/>
  <line x1="14" y1="22" x2="14" y2="26" stroke="#2C4A3E" stroke-width="2" stroke-linecap="round"/>
  <line x1="10" y1="18" x2="6" y2="18" stroke="#2C4A3E" stroke-width="2" stroke-linecap="round"/>
  <line x1="22" y1="18" x2="18" y2="18" stroke="#2C4A3E" stroke-width="2" stroke-linecap="round"/>
  <text x="36" y="24" font-family="Plus Jakarta Sans, sans-serif" font-size="16" font-weight="700" letter-spacing="-0.02em" fill="#1B1C1A">CLUB<tspan fill="#2C4A3E">OS</tspan></text>
  <text x="104" y="19" font-family="JetBrains Mono, monospace" font-size="9" font-weight="600" letter-spacing="0.08em" fill="#5E605B">TINKERS</text>
  <text x="104" y="27" font-family="JetBrains Mono, monospace" font-size="8" font-weight="500" letter-spacing="0.05em" fill="#8C8F89">HUB</text>
</svg>
```

### 3.2 Iconography System
- **Library:** Google Material Symbols Outlined (`opsz: 20..24`, `FILL: 0`, `wght: 400..600`).
- **Core Semantic Icons:**
  - Directives & Tasks: `assignment`, `task_alt`, `pending_actions`, `subdirectory_arrow_right`
  - Roles & People: `shield_person` (Main Head), `supervisor_account` (Group Head), `person` (Member), `person_add`
  - Groups: `precision_manufacturing` (Project Handling), `event` (Event), `account_balance` (Finance), `campaign` (Outreach), `photo_camera` (Media & Documentation)
  - Navigation & State: `dashboard`, `today`, `history`, `notifications`, `chat`, `check_circle`, `warning`, `policy`

### 3.3 Photographic Character
- Authentic editorial documentary style: real students, workshop hardware, schematics, soldering irons, laptops, whiteboard architecture.
- Warm natural daylight, natural studio tones, subtle muted green workshop accents.
- Absolutely no abstract 3D shapes, glossy glass orbs, or stock-photo corporate clichés.

---

## 4. Navigation Architecture & Shell Hierarchy

### 4.1 Global Top Navigation Shell
The workspace shell is uniform across all authenticated views, ensuring rapid context awareness without heavy multi-layer navigation.
- **Left:** Brandmark (`CLUBOS / TINKERS HUB`) + Institutional Breadcrumb/Scope badge (e.g. `MAIN HEAD / COMMAND CENTER`, `PROJECT HANDLING / WORKSPACE`, `MEMBER / MY DAY`).
- **Center:** Quick Search / Task Jump input (`⌘K` or `Ctrl+K`) + Active Scope Filter.
- **Right:**
  - Dynamic Action Button (Role-gated: `+ Issue Main Directive` for Main Head; `+ In-Group Item` for Group Head; `+ Add Scratchpad` for Member).
  - Notifications Bell with unread counter badge.
  - User Identity Pill: Monospace Name, Primary Group Tag, and Sign Out dropdown.

### 4.2 Responsive Layout Intent
The product is built as **ONE responsive web application** targeting desktop, tablet, mobile, and installable PWA:
- **Desktop (≥ 1280px):** Two-pane split views (e.g., Task Ledger 5 cols + Task Inspector 7 cols; or Workboard + Slide-over Drawer).
- **Tablet (768px – 1279px):** Adaptive single/dual pane with collapsible inspector drawer and responsive data tables.
- **Mobile (< 768px):** Clean stacked view with top persistent status bar, bottom quick-action navigation bar, full-screen slide-over sheets for Task Inspector and Delegation, and sticky bottom action strips.

---

## 5. Role-Specific Workspace Blueprints

### 5.1 Main Head Command Center
**Purpose:** Organization-wide governance, directive creation, group health monitoring, and system-wide visibility.

1. **Executive Overview Metrics Row:**
   - Active Directives count
   - Cross-Group Velocity (Completion % across all 5 groups)
   - Bottlenecks & Overdue Requisitions count
   - Institutional Member Count
2. **Functional Groups Health Grid (5 Locked Divisions):**
   - **Project Handling:** Active tasks, Assigned Head, Member capacity status, Progress bar.
   - **Event:** Upcoming event timelines, Event logistics tasks, Group head status.
   - **Finance:** Budget requisitions, Pending approvals, Active budget ledger.
   - **Outreach:** Sponsorship contacts, Community partner tasks, Active reachouts.
   - **Media & Documentation:** Content production pipeline, Design revisions, Guide repositories.
3. **Active Directives Ledger & Filter Bar:**
   - Filters: `All Groups`, `Action Required`, `Overdue`, `High Priority`.
   - Table columns: `Directive ID` (`DIR-2024-09`), `Title`, `Primary Group`, `Assigned Head`, `Active Subtasks`, `SLA / Target Date`, `State` (`Active`, `In Review`, `Completed`), `Actions` (`Inspect`, `Audit`).
4. **Institutional System Audit & Event Stream:**
   - Monospace live audit feed showing real-time timestamps, actors, commit hashes, and role-based changes.
5. **"Issue Main Directive" Slide-over Drawer / Modal:**
   - Title, Assignee Group (strict 1-of-5 select), Target Deadline, Scope of Work, Deliverable Checklist, and Priority.

---

### 5.2 Group Head Workspace
**Purpose:** Operational management of the group's assigned directives, subtask delegation, member workload balance, and task reviews.

1. **Group Identity Header:**
   - Group Title (e.g., `Project Handling — Group Workspace`), Active Group Head badge, Active Tasks count, Team capacity meter.
   - Quick Actions: `+ In-Group Item`, `Dispatch WhatsApp`, `Member Workload Matrix`.
2. **Workspace Tab Architecture:**
   - **Tab 1: Directives & Subtask Tree:** Directives assigned to this group, nested subtasks, status pills (`Awaiting Head Action`, `In Delegation`, `In Progress`, `Ready for Review`, `Approved`).
   - **Tab 2: Member Workload Matrix:** Member capacity cards showing active task count (`0/3 Available`, `2/3 Active`, `3/3 Busy`), skills/focus, and direct delegation triggers.
   - **Tab 3: Review Queue & Verification Log:** Subtasks submitted by members awaiting Group Head sign-off before propagating to Main Head.
3. **Task Delegation Trigger:** Opens the dedicated Task Delegation Panel.

---

### 5.3 Member My Day
**Purpose:** Distraction-free personal workbench for student contributors.

1. **Header & Capacity Tracker:**
   - Greeting, Date, Personal Capacity status (e.g., `Capacity: 2/3 active tasks`).
   - Private scratchpad trigger.
2. **Priority Task Queue:**
   - **Current Focus / Active Task:** Primary highlight card with timer, scope summary, deliverables checklist, and quick status updater (`Start Task`, `Log Progress`, `Submit Deliverable`).
   - **Assigned to Me:** Subtasks delegated by Group Head with deadlines and requirement links.
   - **Open to Claim (Group Pool):** Unassigned subtasks flagged as "Open for Volunteers" by the Group Head, allowing the member to self-claim with one click.
3. **Private Scratchpad (Personal Notes):**
   - In-memory/persisted private scratch notes that are only visible to the member (never exposed to heads or public).
4. **"What Changed" Micro-Feed:**
   - Relevant updates on tasks the member is participating in (e.g., "Devika Nair approved technical schema").

---

## 6. The Central Interactive Shared Object: Task Inspector

The **Task Inspector** is the unified operational ledger present across Main Head, Group Head, and Member views. It implements strict **progressive disclosure**.

```
+-----------------------------------------------------------------------------------------+
| [BACK]  TASK INSPECTOR: TH-TASK-2026-084                             [COPY LINK] [CLOSE]|
| Participant Registration & Attendee Intake Portal                                       |
| [Status: IN PROGRESS]  [Priority: HIGH]  [Group: PROJECT HANDLING]  [Due: Nov 18]         |
+-----------------------------------------------------------------------------------------+
| ACTION STRIP (Role-Gated):                                                              |
| [Main Head: Reassign / Close Directive]                                                 |
| [Group Head: Accept / Delegate Subtask / Approve Review]                                 |
| [Member: Start Work / Mark Ready for Review / Clarify on WhatsApp]                      |
+-----------------------------------------------------------------------------------------+
| [Overview]  |  [Subtasks & Tree]  |  [Discussion]  |  [Files & Specs]  |  [What Changed]|
+-----------------------------------------------------------------------------------------+
|                                                           | SIDEBAR: PEOPLE & TIMELINE  |
| TAB CONTENT AREA                                          | Originator: Main Head       |
| - Rich Scope Description                                  | Lead: Group Head (Devika N.)|
| - Interactive Deliverables Checklist                      | Assignee: Member (Rahul V.) |
| - Acceptance Criteria & Boundary Specifications           | SLA: 4 Days Remaining       |
| - Delegation & Subtask Hierarchy Cards                    +-----------------------------+
| - Audit Trail of Recent State Transitions                 | SAFE WHATSAPP CLARIFICATION |
|                                                           | [Open WhatsApp Sync]        |
+-----------------------------------------------------------------------------------------+
```

### 6.1 Progressive Disclosure Tabs
1. **Overview Tab:** High-level summary, purpose, deliverables checklist, and constraints.
2. **Subtasks & Delegation Tree:** Hierarchy showing parent main directive down to leaf subtasks (`SUB-091-A`, `SUB-091-B`), assignees, and volunteer/claim states.
3. **Discussion Tab:** Chronological commentary with `@mentions`, timestamped notes, and review queries.
4. **Files & Specifications Tab:** Attached technical specs, design assets, API contracts, schematics, and links.
5. **What Changed (Audit Trail Tab):** Granular, immutable log of every status transition, deadline modification, assignee transfer, and review sign-off.

---

## 7. Task Delegation & Workload Availability Engine

The Delegation Engine provides real-time workload-aware task assignment.

### 7.1 Delegation Workflow
1. **Target Selection:** Group Head selects an unassigned subtask or creates a child subtask from an accepted main directive.
2. **Capacity Ledger Inspection:** The panel renders member capacity cards with active load:
   - `0/3 Tasks`: Available (Green indicator)
   - `1-2/3 Tasks`: Active / Moderate load (Amber indicator)
   - `3/3 Tasks`: Overloaded / Saturated (Muted red indicator; requires explicit override)
3. **Assignment Mode:**
   - **Direct Delegation:** Group Head assigns to a specific member with customized instructions.
   - **Open for Volunteers / Claim:** Task is flagged as open pool; any group member can claim it directly from their "My Day" screen.
4. **Dispatch Notice:** An internal notification is generated, and a pre-composed WhatsApp sync message is made available for immediate out-of-band handoff.

---

## 8. Notifications & "What Changed" Ledger

### 8.1 Dual-Stream Event Architecture
To prevent notification fatigue while maintaining total institutional transparency, ClubOS separates communication alerts from state diffs:
1. **Notifications Stream:**
   - Direct `@mentions` in task discussions.
   - Explicit task assignments and delegations.
   - Deliverable review requests requiring head approval.
   - Security and account access alerts.
2. **What Changed (Audit Ledger Stream):**
   - Task state changes (`ASSIGNED` → `IN_PROGRESS` → `READY_FOR_REVIEW` → `COMPLETED`).
   - Assignee or delegatee reassignments.
   - Deadline adjustments and milestone updates.
   - Filterable by Group and Date.

---

## 9. Member & Account Management (Main Head Admin)

### 9.1 Member Directory & Access Registry
- **Strict Single-Group Rule:** Every member belongs to **strictly ONE primary operational group** (`Event`, `Finance`, `Project Handling`, `Outreach`, or `Media & Documentation`).
- **Role Assignment:** Three immutable roles (`Main Head`, `Group Head`, `Member`). Users cannot self-assign or modify roles.
- **Account State Machine:**
  - `PENDING_ACTIVATION`: Account registered by Main Head; waiting for user activation link.
  - `ACTIVE`: Fully activated account with password set and valid credentials.
  - `DEACTIVATED`: Administrative access revocation. All sessions terminated immediately; cannot sign in.

### 9.2 Administrative Operations
- **Add Team Member Drawer:** Name, institutional email, phone (for WhatsApp sync handoff), Primary Group select, Role select. Triggers secure activation email/link generation.
- **Dispatch Reset Access Token Modal:** Generates an ephemeral cryptographic reset token. Never reveals permanent passwords to administrators.
- **Confirm Deactivation Modal:** Explicit warning modal with audit rationale required.

---

## 10. Authentication & Recovery Flows

### 10.1 Unified Sign In
- Single entry point for all users (`/login`).
- Clean editorial form with email and password.
- **Automated Role Resolution:** Post-authentication, the server resolves role and primary group, automatically redirecting the user:
  - Main Head → `/workspace/command-center`
  - Group Head → `/workspace/group`
  - Member → `/workspace/my-day`
- No user-facing role switchers or manual role pickers exist in production.

### 10.2 Account State Banners & Handlers
- **Invalid Credentials:** Inline error state with remaining attempt warning.
- **Pending Activation:** Institutional message directing the user to their email activation invite.
- **Deactivated:** High-visibility banner stating account access has been revoked by administration.
- **Forgot Password:** Requests email, dispatches time-limited reset link.

### 10.3 First-Time Account Activation
- Dedicated route `/activate?token=...`.
- 6-digit passcode or cryptographic token validation.
- Password creation with strict complexity validation (minimum 10 characters, mixed case, numbers, special characters).
- Profile confirmation before direct redirection into workspace.

---

## 11. WhatsApp Task Communication Handoff

### 11.1 Security & Architecture Principles
- **Handoff Only:** WhatsApp is exclusively a communication notification relay. ClubOS is the single authoritative source of truth.
- **Zero Secrets Rule:** **Never** place passwords, temporary login codes, activation tokens, authentication cookies, or confidential phone rosters in WhatsApp dispatches.
- **Pre-Formatted Safe Templates:**
  - **Task Delegation Template:**
    ```
    ClubOS Task Notification — Tinkers Hub
    Task: [Task Title] (ID: [Task ID])
    Group: [Group Name]
    Assigned To: [Member Name]
    Deadline: [Due Date]
    Access official task card: https://clubos.tinkershub.org/task/[Task ID]
    ```
  - **Clarification Query Template:**
    ```
    Hi [Name], regarding [Task ID] ([Task Title]):
    [Query Message]
    Please post your response or update on ClubOS: https://clubos.tinkershub.org/task/[Task ID]
    ```

---

## 12. Public Portal Architecture

The public interface presents Tinkers Hub's initiatives, workshops, and permanent technical records without exposing internal operational data.

### 12.1 Public Home (`/`)
- **Editorial Hero:** High-impact typography (`Building a culture of autonomous making...`), authentic workshop photography, and clear mission statement.
- **Program Divisions Showcase:** Highlighting the 5 groups and their public outputs.
- **Upcoming Flagship Events:** Feature cards with dates, badges, and RSVP/Detail links.
- **Permanent Records Ledger:** Institutional documentation archive summary.
- **Footer:** Clean institutional links and a discrete "ClubOS Internal Sign In" portal link.

### 12.2 Events Archive (`/events`)
- Search and filter bar (`All Events`, `Upcoming`, `Past Archive`).
- Comprehensive chronological grid with event banners, dates, venue tags, and summary abstracts.

### 12.3 Event Detail (`/events/[slug]`)
- Comprehensive technical workshop syllabus, three-day technical agenda, prerequisites, workbench tooling, speaker profiles, and calendar export (`.ics` / Google Calendar).

---

## 13. Component Catalog & Implementation Specifications

| Component | Selector / Path | Purpose & Constraints |
| :--- | :--- | :--- |
| `Brandmark` | `components/common/Brandmark` | SVG institutional compass mark and typographic logo. |
| `AppHeader` | `components/layout/AppHeader` | Global navigation shell with scope badge, search, and user menu. |
| `TaskInspector` | `components/tasks/TaskInspector` | Central multi-tab task drawer with progressive disclosure. |
| `TaskDelegationDrawer` | `components/tasks/TaskDelegationDrawer` | Workload matrix and member assignment sheet. |
| `WorkloadMeter` | `components/common/WorkloadMeter` | Member capacity status chip (`0/3`, `2/3`, `3/3`). |
| `StatusBadge` | `components/common/StatusBadge` | Standardized status pill (`bg-surface-container`, `text-primary`). |
| `WhatsAppModal` | `components/common/WhatsAppModal` | Pre-composed safe WhatsApp dispatch with zero secrets notice. |
| `MemberTable` | `components/admin/MemberTable` | Access registry data ledger with group and role chips. |
| `AuditTimeline` | `components/audit/AuditTimeline` | Monospace lifecycle event ledger ("What Changed"). |
| `AuthCard` | `components/auth/AuthCard` | Editorial authentication container for Sign In & Activation. |

---

## 14. Verification & Audit Trail Summary

Every screen, token, and workflow documented herein was verified directly against the approved Google Stitch production design dataset (`projects/8117860540905587994`, updated September 24, 2026). This document serves as the frozen specification for engineering implementation.
