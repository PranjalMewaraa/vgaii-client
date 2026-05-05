import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardList,
  Globe,
  Heart,
  type LucideIcon,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "VGAII — AI-driven patient acquisition for ad-running clinics",
  description:
    "VGAII captures every Google/Meta ad lead, keeps it in the loop with AI automations, and gates post-visit feedback so bad reviews never reach Google. Built for multi-doctor clinics in India.",
  openGraph: {
    title: "VGAII — Your patients, captured.",
    description:
      "AI keeps every lead in the loop. Bad reviews stay internal. Built for ad-running clinics in India.",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <main className="overflow-x-hidden">
      <Nav />
      <Hero />
      <SocialProofBar />
      <TwoStories />
      <HowItWorks />
      <Features />
      <Roi />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Nav                                                                         */
/* -------------------------------------------------------------------------- */

function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            V
          </span>
          <span className="text-sm font-bold tracking-wide text-slate-900">
            VGAII
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
          <a href="#how" className="hover:text-slate-900">
            How it works
          </a>
          <a href="#features" className="hover:text-slate-900">
            Features
          </a>
          <a href="#roi" className="hover:text-slate-900">
            ROI
          </a>
          <a href="#pricing" className="hover:text-slate-900">
            Pricing
          </a>
          <a href="#faq" className="hover:text-slate-900">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Get started
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-white">
      <BackgroundGrid />
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-16 md:px-8 md:pb-32 md:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
              <Sparkles size={12} />
              For ad-running clinics in India
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
              Your patients,{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                captured.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
              VGAII captures every Google/Meta ad lead, runs AI automations
              behind the scenes that keep each one in the loop, and gates
              post-visit feedback so{" "}
              <span className="font-semibold text-slate-900">
                no bad review goes directly to Google
              </span>
              .
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Get started
                <ArrowRight size={14} />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                See how it works
              </a>
            </div>

            <ul className="mt-7 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-600 sm:grid-cols-3">
              <HeroBullet>Live in 5 days</HeroBullet>
              <HeroBullet>Setup included</HeroBullet>
              <HeroBullet>Cancel anytime</HeroBullet>
            </ul>
          </div>

          <div className="relative">
            <HeroProductMock />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <Check size={14} className="text-emerald-600" />
      {children}
    </li>
  );
}

function BackgroundGrid() {
  // Subtle grid backdrop. Pure CSS so no extra requests; behind everything.
  return (
    <div
      aria-hidden
      className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,white,transparent_85%)]"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(99,102,241,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(99,102,241,0.08) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    />
  );
}

function HeroProductMock() {
  // Stylised product preview — built in plain Tailwind so we don't need a
  // screenshot asset shipped. Once we have polished captures, swap this for
  // real screenshots in <Image>.
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-indigo-200/40 via-violet-200/30 to-emerald-200/30 blur-2xl" />
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-indigo-900/10">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 text-[11px] text-slate-400">vgaii.in/dashboard</span>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <MockTile
            title="New leads (today)"
            value="42"
            delta="+18 vs yesterday"
            tone="indigo"
            icon={ClipboardList}
          />
          <MockTile
            title="Booked appts"
            value="29"
            delta="+9 this week"
            tone="emerald"
            icon={Calendar}
          />

          <div className="md:col-span-2 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <Star size={11} className="fill-amber-400 text-amber-400" />
                Reputation
              </p>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                Last 30 days
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">
                  Google rating
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-2xl font-bold text-slate-900">
                  4.8
                  <Star size={16} className="fill-amber-400 text-amber-400" />
                </p>
                <p className="text-[11px] text-emerald-700">+ 23 new reviews</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">
                  Caught privately
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">7</p>
                <p className="text-[11px] text-slate-500">1–2 ★ never went public</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Bot size={14} />
              </span>
              <p className="text-sm font-semibold text-slate-900">
                AI lead loop
              </p>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-emerald-600" />
                Auto-acknowledged 14 leads in last hour
              </li>
              <li className="flex items-center gap-2">
                <RefreshCw size={12} className="text-indigo-600" />
                Re-engaging 3 cold leads (day 7)
              </li>
              <li className="flex items-center gap-2">
                <Workflow size={12} className="text-indigo-600" />
                2 hot leads routed to Riya at front desk
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockTile({
  title,
  value,
  delta,
  tone,
  icon: Icon,
}: {
  title: string;
  value: string;
  delta: string;
  tone: "indigo" | "emerald";
  icon: LucideIcon;
}) {
  const map = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </p>
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${map[tone]}`}
        >
          <Icon size={14} />
        </span>
      </div>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
      <p className="text-[11px] text-emerald-700">{delta}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Social proof                                                                */
/* -------------------------------------------------------------------------- */

function SocialProofBar() {
  // Placeholder bar — once you have logos / real numbers, swap this for them.
  return (
    <section className="border-y border-slate-200 bg-slate-50/50">
      <div className="mx-auto max-w-6xl px-6 py-6 md:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs uppercase tracking-wider text-slate-500">
          <span className="font-semibold text-slate-700">
            Built for clinics in
          </span>
          <span>Bangalore</span>
          <span>Mumbai</span>
          <span>Pune</span>
          <span>Delhi NCR</span>
          <span>Hyderabad</span>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* The two stories                                                             */
/* -------------------------------------------------------------------------- */

function TwoStories() {
  return (
    <section className="bg-white py-20 md:py-28" id="stories">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <SectionHeader
          eyebrow="Two stories that change the math"
          title="Stop losing leads. Stop losing reviews."
          subtitle="Most clinics already pay for ads. Most clinics already get patients. The difference is in the cracks — leads not followed up, bad reviews not caught in time. We close both."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <StoryCard
            tone="indigo"
            icon={Bot}
            kicker="AI lead loop"
            title="Every lead, kept in the loop."
            body="When a Google or Meta lead arrives, our AI automations take over. Auto-acknowledge in seconds, follow-up nudges on smart cadences, re-engagement on stale leads, hot routing to whichever staff member is free. Your team works from a clean to-do list — not a chaotic inbox."
            stats={[
              { label: "Slip-through", value: "↓ significantly" },
              { label: "Response time", value: "Under 60s" },
              { label: "Lost-lead recovery", value: "Up to 35%" },
            ]}
          />
          <StoryCard
            tone="amber"
            icon={ShieldCheck}
            kicker="Reputation gating"
            title="No bad review goes directly to Google."
            body="After every visit, the patient gets a private feedback link. 4 or 5 stars are guided to leave a Google review. 1 or 2 stars route to you privately — no public post. You call them back the same day, fix the issue, and turn an unhappy patient into a loyal one."
            stats={[
              { label: "Public reviews", value: "Skew positive" },
              { label: "Bad-review save rate", value: "↑ dramatically" },
              { label: "Patient saved", value: "Same day" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function StoryCard({
  tone,
  icon: Icon,
  kicker,
  title,
  body,
  stats,
}: {
  tone: "indigo" | "amber";
  icon: LucideIcon;
  kicker: string;
  title: string;
  body: string;
  stats: Array<{ label: string; value: string }>;
}) {
  const map = {
    indigo: {
      ring: "ring-indigo-100",
      iconBg: "bg-indigo-600",
      kickerBg: "bg-indigo-50 text-indigo-700",
      bg: "from-indigo-50 to-white",
    },
    amber: {
      ring: "ring-amber-100",
      iconBg: "bg-amber-500",
      kickerBg: "bg-amber-50 text-amber-700",
      bg: "from-amber-50 to-white",
    },
  };
  const s = map[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b ${s.bg} p-7 ring-1 ${s.ring}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${s.iconBg}`}
        >
          <Icon size={18} />
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${s.kickerBg}`}
        >
          {kicker}
        </span>
      </div>
      <h3 className="mt-5 text-2xl font-bold leading-tight text-slate-900">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p>
      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-slate-200/60 pt-5">
        {stats.map(s => (
          <div key={s.label}>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              {s.label}
            </p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* How it works                                                                */
/* -------------------------------------------------------------------------- */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      icon: Zap,
      title: "Lead arrives",
      body: "Google Ad / Meta lead form / your landing page POSTs into VGAII via webhook. The patient gets an instant auto-acknowledge.",
    },
    {
      n: "02",
      icon: Bot,
      title: "AI follows up",
      body: "Smart nudges at the right cadence. Stale leads get re-engaged. Hot leads route to whichever staff member is free.",
    },
    {
      n: "03",
      icon: Calendar,
      title: "Patient books",
      body: "Cal.com slot picker, phone & name pre-filled. Confirmation goes by WhatsApp. The visit lands on the calendar.",
    },
    {
      n: "04",
      icon: Heart,
      title: "Visit recorded",
      body: "Staff marks the visit complete, attaches prescription / lab report / X-ray. All searchable, accessible from any device.",
    },
    {
      n: "05",
      icon: ShieldCheck,
      title: "Reputation gating",
      body: "Patient gets a private feedback link. 4–5 ★ → Google review. 1–2 ★ → routes to you privately. You decide what goes public.",
    },
    {
      n: "06",
      icon: TrendingUp,
      title: "Owner sees the math",
      body: "Monday morning: leads, conversions, no-show rate, rating trend. The view that tells you whether ads are paying back.",
    },
  ];
  return (
    <section className="bg-slate-50 py-20 md:py-28" id="how">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <SectionHeader
          eyebrow="How it works"
          title="From ad click to 5-star review."
          subtitle="One system, six steps. No spreadsheets, no WhatsApp groups, no leaks."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map(s => (
            <div
              key={s.n}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex items-start justify-between">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <s.icon size={18} />
                </span>
                <span className="text-xs font-bold tracking-widest text-slate-300">
                  {s.n}
                </span>
              </div>
              <h3 className="mt-5 text-base font-semibold text-slate-900">
                {s.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Features                                                                    */
/* -------------------------------------------------------------------------- */

function Features() {
  const items = [
    {
      icon: ClipboardList,
      title: "Lead capture",
      body: "Webhooks for Google Ads, Meta forms, your landing pages. Every lead in one CRM, instantly.",
    },
    {
      icon: Calendar,
      title: "Cal.com booking",
      body: "Patients book themselves. Phone, name, time pre-filled. Confirmation via WhatsApp.",
    },
    {
      icon: Users,
      title: "Patient records",
      body: "Visit history, prescriptions, lab reports, X-rays — searchable from any device.",
    },
    {
      icon: MessageSquare,
      title: "Feedback flow",
      body: "Post-visit feedback link. Star-rating gates the review. Bad reviews stay internal.",
    },
    {
      icon: Globe,
      title: "Branded profile",
      body: "Public landing page at your-clinic.com. Pulls live Google rating. Captures inquiries.",
    },
    {
      icon: BarChart3,
      title: "Reports",
      body: "Funnel, source attribution, no-show rate, rating trend. Monday-morning view for the owner.",
    },
  ];
  return (
    <section className="bg-white py-20 md:py-28" id="features">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <SectionHeader
          eyebrow="Everything you need"
          title="One panel. The whole funnel."
          subtitle="Built for ad-running clinics — every feature earns its place."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(f => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-indigo-200 hover:shadow-md"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                <f.icon size={18} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {f.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* ROI                                                                         */
/* -------------------------------------------------------------------------- */

function Roi() {
  const rows: Array<{ label: string; value: string; emphasis?: boolean }> = [
    { label: "Monthly ad spend", value: "₹50,000" },
    { label: "Leads / month at ₹500 CPL", value: "100" },
    { label: "Currently lost (industry avg ~35%)", value: "35" },
    { label: "Patients recovered (20% conversion)", value: "7 / month" },
    { label: "Avg revenue per patient", value: "₹15,000" },
    { label: "Additional revenue / month", value: "₹1,05,000", emphasis: true },
    { label: "VGAII subscription", value: "− ₹10,000" },
    { label: "Net gain / month", value: "₹95,000", emphasis: true },
  ];
  return (
    <section
      className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 py-20 text-white md:py-28"
      id="roi"
    >
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-300/40 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-200">
              <TrendingUp size={12} />
              The math
            </span>
            <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              ~9.5× ROI in the average month.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-300">
              For a clinic spending ₹50k/mo on ads, recovering even 20% of
              currently-lost leads is enough to pay back the subscription{" "}
              <span className="font-semibold text-white">9.5 times over</span>.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              The math gets stronger for high-LTV specialties — dental
              implants, fertility, cosmetic surgery, hair restoration — where
              one converted patient covers a full year of subscription.
            </p>
            <Link
              href="/login"
              className="mt-7 inline-flex items-center gap-1.5 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Run your numbers
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-indigo-200">
                Sample clinic — ₹50k/mo ad spend
              </p>
              <div className="divide-y divide-white/10">
                {rows.map(r => (
                  <div
                    key={r.label}
                    className="flex items-center justify-between py-2.5"
                  >
                    <span
                      className={`text-sm ${r.emphasis ? "font-bold text-white" : "text-slate-300"}`}
                    >
                      {r.label}
                    </span>
                    <span
                      className={`font-mono text-sm tabular-nums ${
                        r.emphasis ? "text-2xl font-bold text-emerald-300" : "text-white"
                      }`}
                    >
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Pricing                                                                     */
/* -------------------------------------------------------------------------- */

function Pricing() {
  return (
    <section className="bg-white py-20 md:py-28" id="pricing">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <SectionHeader
          eyebrow="Pricing"
          title="One plan. Three ways to start."
          subtitle="Setup, training, and unlimited staff seats are included at every tier. No setup fees."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <PricingCard
            name="90-day pilot"
            price="₹25,000"
            cadence="flat"
            blurb="De-risk it. Applies as credit if you continue annually."
            cta="Start a pilot"
            features={[
              "Everything in the product",
              "Setup + training included",
              "Weekly check-ins",
              "Credit applies to annual",
            ]}
          />
          <PricingCard
            name="Annual"
            price="₹1,00,000"
            cadence="/ year"
            blurb="Best value — saves ₹20,000 vs monthly. Locked-in pricing."
            cta="Get started"
            features={[
              "Everything in the product",
              "Setup + training included",
              "Weekly check-ins for first 30 days",
              "Locked-in pricing",
              "Priority WhatsApp support",
            ]}
            highlight
          />
          <PricingCard
            name="Monthly"
            price="₹10,000"
            cadence="/ month"
            blurb="Same product. Pay as you go. Cancel any time."
            cta="Get started"
            features={[
              "Everything in the product",
              "Setup + training included",
              "Cancel any time",
              "Standard support",
            ]}
          />
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Prices in INR. Includes setup, branding, custom domain wiring,
          unlimited staff seats, and 25 GB document storage.
        </p>
      </div>
    </section>
  );
}

function PricingCard({
  name,
  price,
  cadence,
  blurb,
  cta,
  features,
  highlight,
}: {
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  cta: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-7 ${
        highlight
          ? "border-indigo-300 bg-gradient-to-b from-indigo-50 to-white shadow-xl shadow-indigo-900/5 ring-2 ring-indigo-500"
          : "border-slate-200 bg-white"
      }`}
    >
      {highlight && (
        <span className="absolute -top-3 left-7 inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">
          <Sparkles size={10} />
          Recommended
        </span>
      )}
      <h3 className="text-base font-semibold text-slate-900">{name}</h3>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight text-slate-900">
          {price}
        </span>
        <span className="text-sm text-slate-500">{cadence}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{blurb}</p>

      <Link
        href="/login"
        className={`mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
          highlight
            ? "bg-indigo-600 text-white hover:bg-indigo-700"
            : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
        }`}
      >
        {cta}
        <ArrowRight size={14} />
      </Link>

      <ul className="mt-6 space-y-2.5 text-sm text-slate-600">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2">
            <CheckCircle2
              size={14}
              className={`mt-0.5 shrink-0 ${highlight ? "text-indigo-600" : "text-emerald-600"}`}
            />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* FAQ                                                                         */
/* -------------------------------------------------------------------------- */

function Faq() {
  const items = [
    {
      q: "Will this replace my existing EMR / billing software?",
      a: "No — and we don't try to. VGAII is the layer between your ads and your calendar. Clinical records, prescriptions, lab reports get attached to patients here for the front desk's workflow, but if you have a dedicated billing system, keep using it.",
    },
    {
      q: "How is this 'AI'? Sounds like just automation.",
      a: "The AI sits in the follow-up loop — deciding when to re-engage a stale lead, what cadence works for which source, when to escalate to a real human, when to trigger the review prompt after a visit. Your receptionist sees a clean to-do list. The system handles the timing and the chase.",
    },
    {
      q: "What stops a patient from leaving a 1-star Google review directly?",
      a: "Nothing stops them — but our flow gets to them first. After every visit they get a private feedback link. If they're upset, that link captures the complaint internally before they think to vent on Google. Most upset patients use the first prompt that arrives, and we make sure ours arrives first.",
    },
    {
      q: "How long does setup take?",
      a: "We're live with your real data within 5 working days. Day 0 is a kickoff call (45 min). Days 1–7 we white-glove your existing patient list (CSV import) and train two staff members. We sit in for the first real lead intake.",
    },
    {
      q: "Do you integrate with WhatsApp, Google Ads, Meta lead forms?",
      a: "Yes — webhooks for all three. WhatsApp confirmations and feedback links use whatever provider you already pay (Twilio, Gupshup, etc.). We wire it up; the carrier bill is yours.",
    },
    {
      q: "Who actually uses the software day-to-day?",
      a: "Your front-desk staff and clinic manager use it most. The doctor logs in once a week to review patients and the dashboard. The owner reviews the Monday-morning report.",
    },
    {
      q: "What if our ad spend is below ₹50k/month?",
      a: "Honestly, we're probably not the right fit yet. Most of the value is in lead recovery and reputation gating — both compound with volume. If you ramp up ad spend later, call us back.",
    },
    {
      q: "Can I cancel any time?",
      a: "Yes on monthly. Annual prepaid is locked in for 12 months but transfers month-by-month into year two unless you say otherwise. Your data is always yours — we'll export it whenever you ask.",
    },
  ];
  return (
    <section className="bg-slate-50 py-20 md:py-28" id="faq">
      <div className="mx-auto max-w-3xl px-6 md:px-8">
        <SectionHeader
          eyebrow="Common questions"
          title="Things every clinic asks."
          subtitle="If you don't see yours, ping us on WhatsApp."
        />
        <div className="mt-12 space-y-3">
          {items.map(i => (
            <details
              key={i.q}
              className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                {i.q}
                <span className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-open:rotate-45 group-open:bg-indigo-600 group-open:text-white">
                  <Plus size={14} />
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {i.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// Tiny inline + icon since lucide's Plus is already imported elsewhere; keeps
// the FAQ details element animation contained.
function Plus({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Final CTA                                                                   */
/* -------------------------------------------------------------------------- */

function FinalCta() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-6 md:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 px-8 py-14 text-center shadow-2xl shadow-indigo-900/20 md:px-14 md:py-20">
          <div
            aria-hidden
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(white 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white ring-1 ring-white/20">
              <Sparkles size={12} />
              Live in 5 days
            </span>
            <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl">
              Stop losing leads.
              <br />
              Start gating reviews.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-indigo-100">
              Join the clinics already running every Google Ad lead, every
              booking, and every review through one panel.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-6 py-3.5 text-sm font-semibold text-indigo-700 shadow-md transition hover:bg-indigo-50"
              >
                Get started
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-6 text-xs text-indigo-200">
              No credit card to start. Cancel any time.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                      */
/* -------------------------------------------------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              V
            </span>
            <div>
              <p className="text-sm font-bold tracking-wide text-slate-900">
                VGAII
              </p>
              <p className="text-[11px] text-slate-500">
                AI-driven patient acquisition for clinics in India
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600">
            <a href="#how" className="hover:text-slate-900">
              How it works
            </a>
            <a href="#features" className="hover:text-slate-900">
              Features
            </a>
            <a href="#pricing" className="hover:text-slate-900">
              Pricing
            </a>
            <a href="#faq" className="hover:text-slate-900">
              FAQ
            </a>
            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Sign in →
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} VGAII. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/* Section header                                                              */
/* -------------------------------------------------------------------------- */

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
        <Building2 size={12} />
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-slate-600">
        {subtitle}
      </p>
    </div>
  );
}
