# ClubOS — Tinkers Hub Management Platform

> **Build 01: Project Foundation**  
> Responsive web application and PWA foundation for Tinkers Hub operations.

---

## 1. Overview

ClubOS is an institutional management platform engineered for **Tinkers Hub**. It coordinates five core functional groups:
1. **Event**
2. **Finance**
3. **Project Handling**
4. **Outreach**
5. **Media & Documentation**

The platform operates on a strict security model:
- **Main Head:** Global visibility and directive management across the entire organization.
- **Group Head:** Operational authority scoped strictly to their primary group.
- **Member:** Scoped strictly to their own assigned deliverables plus permitted group tasks.
- **Member Rule:** Every member belongs to **strictly ONE primary group**.
- **The Task:** The central interactive object connecting Main Head → Group Head → Member.

---

## 2. Technology Stack & Foundations

- **Framework:** Next.js 15 (App Router, Server Components)
- **Language:** TypeScript 5.8 (Strict typechecking enabled)
- **Styling:** Tailwind CSS 3.4 (Custom design tokens configured in `tailwind.config.ts`)
- **PWA:** Web App Manifest (`src/app/manifest.ts`), service worker integration (`public/sw.js`), installable metadata
- **Typography:** Plus Jakarta Sans (Headings & Body), JetBrains Mono (Codes, Timelines, Badges)
- **Iconography:** Google Material Symbols Outlined

---

## 3. Visual System & Anti-Vibecoding Rules

ClubOS follows the approved visual guidelines documented in [`DESIGN.md`](./DESIGN.md):
- **Surfaces:** Warm paper / bone surfaces (`#fbf9f5`), surface container hierarchy (`#ffffff` to `#e4e2df`).
- **Typography:** Charcoal text (`#1b1c1a`), secondary slate (`#414845`).
- **Brand Accent:** Restrained institutional slate green (`#153328` / `#2c4a3e`).
- **Borders & Elevation:** Crisp hairline borders (`#c1c8c3`), minimal elevation, controlled radius (max 8px).
- **Strict Anti-Vibecoding Enforced:** Absolutely no purple AI glows, neons, glassmorphism, decorative particles, dot grids, emojis, or bento layouts.

---

## 4. Project Structure

```
CLUBOS/
├── DESIGN.md                       # Approved visual & interaction system
├── README.md                       # Engineering documentation
├── package.json                    # Dependencies and build scripts
├── tsconfig.json                   # Strict TypeScript configuration
├── tailwind.config.ts              # ClubOS design tokens
├── postcss.config.mjs              # PostCSS configuration
├── next.config.ts                  # Next.js configuration
├── .gitignore                      # Git ignore rules
├── .env.example                    # Environment variable template
├── public/
│   ├── sw.js                       # PWA Service Worker integration point
│   └── icon.svg                    # Institutional compass brandmark
└── src/
    ├── app/
    │   ├── layout.tsx              # Root layout with fonts, metadata, and PWA register
    │   ├── globals.css             # CSS custom properties and accessibility styles
    │   ├── manifest.ts             # Web app manifest
    │   ├── loading.tsx             # Global loading state
    │   ├── not-found.tsx           # Global 404 page
    │   ├── error.tsx               # Global error boundary
    │   ├── (public)/               # Public Portal
    │   │   ├── layout.tsx          # Public header and footer
    │   │   ├── page.tsx            # Tinkers Hub Home
    │   │   └── events/             # Events Archive & Event Detail
    │   ├── (auth)/                 # Authentication Boundaries
    │   │   ├── layout.tsx          # Centered editorial auth card layout
    │   │   ├── login/              # Unified Sign In
    │   │   ├── activate/           # First-Time Account Activation
    │   │   ├── recover/            # Password Recovery Request
    │   │   └── reset-password/     # Secure Token Password Reset
    │   └── (workspace)/            # Protected Operational Workspaces
    │       ├── layout.tsx          # Workspace header with scope treatment
    │       ├── command-center/     # Main Head Command Center
    │       ├── group/              # Group Head Workspace
    │       ├── my-day/             # Member My Day
    │       ├── tasks/[id]/         # Shared Task Inspector
    │       ├── notifications/      # Notifications & What Changed
    │       └── admin/members/      # Member & Access Registry
    ├── components/
    │   ├── brand/Brandmark.tsx     # Institutional SVG Wordmark
    │   ├── layout/                 # Headers, Footers, PageContainer, PwaRegister
    │   └── ui/                     # Button, Input, Divider, StatusBadge, Typography, etc.
    └── lib/
        └── utils.ts                # cn (clsx + twMerge)
```

---

## 5. Getting Started

### Prerequisites
- Node.js `v20.x` or higher (`v26.x` tested)
- npm `v10.x` or higher

### Installation
```bash
npm install
```

### Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Typecheck & Build
```bash
# Run strict TypeScript validation
npm run typecheck

# Build production bundle
npm run build
```

---

## 6. Route Map

| Path | Area | Description |
| :--- | :--- | :--- |
| `/` | Public | Tinkers Hub Home |
| `/events` | Public | Events & Workshops Archive |
| `/events/[slug]` | Public | Event Detail & Agenda |
| `/login` | Auth | Unified Sign In |
| `/activate` | Auth | First-Time Account Activation |
| `/recover` | Auth | Password Recovery Request |
| `/reset-password` | Auth | Set New Password |
| `/workspace/command-center` | Workspace | Main Head Command Center |
| `/workspace/group` | Workspace | Group Head Workspace |
| `/workspace/my-day` | Workspace | Member My Day |
| `/workspace/tasks/[id]` | Workspace | Shared Task Inspector |
| `/workspace/notifications` | Workspace | Notifications & What Changed |
| `/workspace/admin/members` | Admin | Main Head Member Registry |

---

## 7. Upcoming Milestones

- **Build 02:** Data Models, Database Schemas, and Server-Side Authentication
- **Build 03:** Core Task Engine, Delegation, and Workload Matrix
- **Build 04:** Member My Day, Notifications, and Audit Ledgers
- **Build 05:** Public Events Integration & Safe WhatsApp Communication Handoff
