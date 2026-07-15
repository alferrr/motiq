// Client-safe: types, constants, and defaults only. Keep DB access
// (lib/content-loader.ts) out of this file — the /content editor page is a
// client component that imports SiteContent/ALLOWED_IMAGES from here, and
// pulling in lib/db.ts (mysql2) would break the client bundle.

export interface HeroContent {
  headline: string;
  subhead: string;
  ctaPrimaryLabel: string;
  ctaSecondaryLabel: string;
}

export interface PlatformFeature {
  title: string;
  desc: string;
  image: string;
  span: "wide" | "narrow";
}

export interface PlatformContent {
  eyebrow: string;
  heading: string;
  paragraph: string;
  features: PlatformFeature[];
}

export interface MeetStat {
  value: number;
  suffix: string;
  label: string;
}

export interface MeetContent {
  eyebrow: string;
  heading: string;
  paragraph: string;
  stats: MeetStat[];
}

export interface HowItWorksStep {
  title: string;
  desc: string;
  image: string;
}

export interface HowItWorksContent {
  eyebrow: string;
  heading: string;
  paragraph: string;
  steps: HowItWorksStep[];
}

export interface FooterContent {
  headline: string;
  paragraph: string;
  ctaPrimaryLabel: string;
  ctaSecondaryLabel: string;
}

export interface SiteContent {
  hero: HeroContent;
  platform: PlatformContent;
  meet: MeetContent;
  howItWorks: HowItWorksContent;
  footer: FooterContent;
}

// Images an editor is allowed to pick for landing-page sections — v1 has no
// upload capability, so this is scoped to files already shipped in /public.
export const ALLOWED_IMAGES = [
  "/vehicle.png",
  "/jobstatus.png",
  "/invoice.png",
  "/profile.png",
  "/orders.png",
  "/reports.png",
  "/meet.png",
  "/bg.jpg",
  "/bg2.png",
  "/bflare.png",
  "/footer.png",
  "/hero.png",
] as const;

// Mirrors the hardcoded copy that previously lived directly in Hero.tsx /
// Footer.jsx — used whenever a SiteContent row is missing or the DB is
// unreachable, so the public landing page never breaks.
export const DEFAULT_SITE_CONTENT: SiteContent = {
  hero: {
    headline: "Everything your garage needs.\nOne platform.",
    subhead:
      "The all-in-one management platform designed for independent garages\nand growing auto repair businesses.",
    ctaPrimaryLabel: "Get Started Free",
    ctaSecondaryLabel: "Sign In",
  },
  platform: {
    eyebrow: "THE PLATFORM",
    heading: "Built for modern garages",
    paragraph:
      "Motiq replaces paperwork with an intuitive digital workspace that keeps your operations connected and your business running efficiently.",
    features: [
      {
        title: "Customer & Vehicle Record Managment",
        desc: "Store and organize customer information, vehicle details, service history, and repair reords for quick and accurate retrieval",
        image: "/profile.png",
        span: "wide",
      },
      {
        title: "Repair Job Tracking",
        desc: "Monitor ongoing repairs, assign tasks, track job status, and maintain detailed service documentation.",
        image: "/orders.png",
        span: "narrow",
      },
      {
        title: "Reports & Analytics",
        desc: "Access service reports, revenue summaries, repair histories, and performance metrics to support informed decision-making.",
        image: "/reports.png",
        span: "wide",
      },
      {
        title: "Automated Billing & Invoicing",
        desc: "Generate accurate invoices automatically based on labor costs and parts used, reducing calculation errors and improving transparency.",
        image: "/invoice.png",
        span: "narrow",
      },
    ],
  },
  meet: {
    eyebrow: "MEET MOTIQ",
    heading: "One Platform That Connects\nYour Entire Garage",
    paragraph:
      "Manage customers, mechanics, repair jobs, inventory, and billing through one centralized dashboard designed specifically for auto-repair businesses.",
    stats: [
      { value: 100, suffix: "+", label: "Garages Ready for Digital Management" },
      { value: 1, suffix: "K+", label: "Customer & Vehicle Records Managed" },
      { value: 5, suffix: "x", label: "Faster Repair History Retrieval" },
      { value: 100, suffix: "%", label: "Accurate Automated Billing" },
    ],
  },
  howItWorks: {
    eyebrow: "HOW IT WORKS",
    heading: "Manage Your Garage in\nThree Simple Steps",
    paragraph:
      "MOTIQ streamlines every stage of your workflow—from customer registration to repair completion and billing.",
    steps: [
      {
        title: "Register Customer & Vehicle",
        desc: "Record customer information, vehicle details, and reported issues into the system.",
        image: "/vehicle.png",
      },
      {
        title: "Manage Repair Process",
        desc: "Assign repair jobs, update service progress, and maintain detailed repair records.",
        image: "/jobstatus.png",
      },
      {
        title: "Generate Billing & Reports",
        desc: "Automatically compute labor and parts costs, print invoices, and maintain accurate financial records.",
        image: "/invoice.png",
      },
    ],
  },
  footer: {
    headline: "Smarter Garage Management Starts Here.",
    paragraph:
      "Bring customer records, repair tracking, and billing together in one integrated garage management system built to streamline daily operations, reduce manual work, and deliver faster, more efficient service.",
    ctaPrimaryLabel: "Get Started Free",
    ctaSecondaryLabel: "Sign In",
  },
};

export const CONTENT_KEY_MAP: Record<keyof SiteContent, string> = {
  hero: "landing.hero",
  platform: "landing.platform",
  meet: "landing.meet",
  howItWorks: "landing.howItWorks",
  footer: "landing.footer",
};
