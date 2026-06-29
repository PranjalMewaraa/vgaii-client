import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Globe,
  Heart,
  type LucideIcon,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "ClinicEssential - WhatsApp-first clinic growth automation",
  description:
    "ClinicEssential helps clinics automate patient follow-ups, bookings, appointment reminders, and Google review collection through one WhatsApp-first system.",
  openGraph: {
    title: "ClinicEssential - automate follow-ups, bookings & Google reviews",
    description:
      "A practical growth system for Indian clinics that want faster lead response, cleaner bookings, and better Google reviews.",
    type: "website",
  },
};

const DEMO_HREF = "/login";
const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919876543210";
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hi, I want to book a free ClinicEssential demo.",
)}`;

export default function LandingPage() {
  return (
    <main className="overflow-x-hidden">
      <Nav />
      <Hero />
      <SocialProofBar />
      <TwoStories />
      <BeforeAfter />
      <HowItWorks />
      <AutomationPreview />
      <Features />
      <ProductScreenshots />
      <WhoThisIsFor />
      <Roi />
      <Onboarding />
      <Addons />
      <Comparison />
      <Faq />
      <FinalCta />
      <Footer />
      <FloatingWhatsAppCta />
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
            C
          </span>
          <span className="text-sm font-bold tracking-wide text-slate-900">
            ClinicEssential
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
          <a href="#addons" className="hover:text-slate-900">
            Add-ons
          </a>
          <a href="#faq" className="hover:text-slate-900">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href={DEMO_HREF}
            className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href={DEMO_HREF}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Book Free Demo
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
              <MessageSquare size={12} />
              WhatsApp-first system for Indian clinics
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
              Automate follow-ups, bookings & Google reviews for your clinic.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
              ClinicEssential helps clinics automate patient follow-ups,
              appointment reminders, and review collection - all from one
              WhatsApp-first system.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <PrimaryCta />
              <WhatsAppCta />
            </div>

            <TrustStrip />
          </div>

          <div className="relative">
            <HeroProductMock />
          </div>
        </div>
      </div>
    </section>
  );
}

function PrimaryCta({
  className = "",
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <Link
      href={DEMO_HREF}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-5 py-3 text-sm font-semibold shadow-sm transition ${
        inverted
          ? "bg-white text-indigo-700 hover:bg-indigo-50"
          : "bg-indigo-600 text-white hover:bg-indigo-700"
      } ${className}`}
    >
      Book Free Demo
      <ArrowRight size={14} />
    </Link>
  );
}

function WhatsAppCta({ className = "" }: { className?: string }) {
  return (
    <a
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${className}`}
    >
      <MessageSquare size={14} />
      Talk on WhatsApp
    </a>
  );
}

function TrustStrip() {
  return (
    <div className="mt-7 flex flex-wrap items-center gap-2">
      <TrustBadge icon={MessageSquare}>WhatsApp-first</TrustBadge>
      <TrustBadge icon={Star}>Google Reviews</TrustBadge>
      <TrustBadge icon={Building2}>Used by clinics in India</TrustBadge>
      <TrustBadge icon={Calendar}>Setup in 7 days</TrustBadge>
      <TrustBadge icon={CheckCircle2}>No app required</TrustBadge>
    </div>
  );
}

function TrustBadge({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
      <Icon size={13} className="text-indigo-600" />
      {children}
    </span>
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
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-indigo-200/40 via-emerald-100/40 to-amber-100/40 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-indigo-900/10">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 text-[11px] text-slate-400">
            clinicessential.in/dashboard
          </span>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Aarogya Dental - Today
                </p>
                <p className="text-xs text-slate-500">
                  Leads, appointments, reviews
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                Live
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MockTile
                title="New leads"
                value="42"
                delta="14 auto-replied"
                tone="indigo"
                icon={ClipboardList}
              />
              <MockTile
                title="Booked"
                value="29"
                delta="+9 this week"
                tone="emerald"
                icon={Calendar}
              />
              <MockTile
                title="Reviews"
                value="4.8"
                delta="+23 this month"
                tone="amber"
                icon={Star}
              />
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Patient pipeline
                </p>
                <p className="text-[11px] text-slate-400">Last 24 hours</p>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ["Priya S.", "Dental implant inquiry", "Auto reply sent"],
                  ["Manish R.", "Booked for 6:30 PM", "Reminder queued"],
                  ["Neha K.", "Post-visit feedback", "Google review link sent"],
                ].map(([name, need, status]) => (
                  <div
                    key={name}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg bg-white px-3 py-2.5 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{name}</p>
                      <p className="text-slate-500">{need}</p>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-2 py-1 font-semibold text-indigo-700">
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <WhatsAppPreviewCard />
        </div>
      </div>
    </div>
  );
}

function WhatsAppPreviewCard() {
  return (
    <div className="bg-emerald-50/70 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">
            <MessageSquare size={15} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">WhatsApp flow</p>
            <p className="text-[11px] text-slate-500">No app required</p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-emerald-700">
          Online
        </span>
      </div>
      <div className="space-y-2.5 rounded-2xl border border-emerald-100 bg-white p-3">
        <ChatBubble side="left">Hi, I want to know implant cost.</ChatBubble>
        <ChatBubble side="right">
          Thanks, Priya. Our clinic will call you shortly. You can also book a
          slot here: clinic.link/book
        </ChatBubble>
        <ChatBubble side="right">
          Reminder: your appointment is today at 6:30 PM.
        </ChatBubble>
        <ChatBubble side="right">
          Hope your visit went well. Please share feedback: clinic.link/review
        </ChatBubble>
      </div>
    </div>
  );
}

function ChatBubble({
  children,
  side,
}: {
  children: React.ReactNode;
  side: "left" | "right";
}) {
  return (
    <div className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}>
      <p
        className={`max-w-[86%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
          side === "right"
            ? "rounded-br-md bg-emerald-600 text-white"
            : "rounded-bl-md bg-slate-100 text-slate-700"
        }`}
      >
        {children}
      </p>
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
  tone: "indigo" | "emerald" | "amber";
  icon: LucideIcon;
}) {
  const map = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
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
          subtitle="Most clinics already pay for ads. The loss happens after the inquiry: slow replies, manual reminders, and review requests that never go out."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <StoryCard
            tone="indigo"
            icon={MessageSquare}
            kicker="Lead response"
            title="Every inquiry gets an instant reply."
            body="When a lead arrives, ClinicEssential sends the first WhatsApp reply, shares the right booking path, and keeps nudging until your team can take over. Your receptionist gets a clean pipeline, not a messy inbox."
            stats={[
              { label: "Missed leads", value: "↓ sharply" },
              { label: "Response time", value: "Under 60s" },
              { label: "Lost-lead recovery", value: "Up to 35%" },
            ]}
          />
          <StoryCard
            tone="amber"
            icon={ShieldCheck}
            kicker="Review workflow"
            title="Good reviews go public. Complaints reach you first."
            body="After every visit, patients receive a private feedback link. Happy patients are guided to Google. Unhappy patients are routed internally so your team can call, fix, and protect the clinic's reputation."
            stats={[
              { label: "Public reviews", value: "Skew positive" },
              { label: "Complaints", value: "Private first" },
              { label: "Follow-up", value: "Same day" },
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
/* Before / after                                                              */
/* -------------------------------------------------------------------------- */

function BeforeAfter() {
  const rows = [
    ["Missed WhatsApp leads", "Instant auto-replies"],
    ["No review follow-up", "Automated review requests"],
    ["Manual appointment reminders", "Automated reminders"],
    ["Receptionist overload", "Centralized patient pipeline"],
  ];

  return (
    <section className="bg-white pb-20 md:pb-28">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:p-7">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            What changes with ClinicEssential
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ComparisonColumn
              title="Traditional Clinic Workflow"
              tone="muted"
              items={rows.map(([before]) => before)}
            />
            <ComparisonColumn
              title="With ClinicEssential"
              tone="active"
              items={rows.map(([, after]) => after)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparisonColumn({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "muted" | "active";
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      <ul className="mt-4 space-y-3">
        {items.map(item => (
          <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
            {tone === "active" ? (
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
            ) : (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
            )}
            {item}
          </li>
        ))}
      </ul>
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
      body: "A Google ad, Meta form, website, or WhatsApp inquiry lands in one clinic pipeline.",
    },
    {
      n: "02",
      icon: MessageSquare,
      title: "WhatsApp reply goes out",
      body: "The patient gets an instant acknowledgement, booking link, and helpful next step.",
    },
    {
      n: "03",
      icon: Calendar,
      title: "Patient books",
      body: "Phone, name, and time are captured. Confirmation and reminders go by WhatsApp.",
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
      title: "Review request goes out",
      body: "Happy patients are guided to Google. Complaints are routed privately for your team.",
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
          subtitle="One system, six steps. No spreadsheets, no scattered WhatsApp chats, no missed follow-ups."
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
/* WhatsApp automation preview                                                 */
/* -------------------------------------------------------------------------- */

function AutomationPreview() {
  const steps = [
    {
      icon: ClipboardList,
      title: "Patient inquiry received",
      body: "New lead is captured with name, phone, source, and treatment interest.",
    },
    {
      icon: MessageSquare,
      title: "Instant WhatsApp auto reply",
      body: "The patient gets a clear reply before they message another clinic.",
    },
    {
      icon: Calendar,
      title: "Booking link shared",
      body: "They can choose a slot without waiting for a callback.",
    },
    {
      icon: RefreshCw,
      title: "Reminder automation",
      body: "Appointment reminders reduce no-shows and manual chasing.",
    },
    {
      icon: Star,
      title: "Google review request",
      body: "Post-visit feedback routes happy patients to Google.",
    },
  ];

  return (
    <section className="bg-slate-50 pb-20 md:pb-28">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <SectionHeader
          eyebrow="Patient automation"
          title="How patient automation works"
          subtitle="Patients interact directly through WhatsApp - no app installation required."
        />
        <div className="mt-12 grid gap-3 md:grid-cols-5">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="relative rounded-xl border border-slate-200 bg-white p-5"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <step.icon size={18} />
              </span>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Step {index + 1}
              </p>
              <h3 className="mt-1 text-sm font-semibold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {step.body}
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
      body: "Google Ads, Meta forms, website inquiries, and WhatsApp leads in one pipeline.",
    },
    {
      icon: Calendar,
      title: "Cal.com booking",
      body: "Patients book themselves. Phone, name, time pre-filled. Confirmation via WhatsApp.",
    },
    {
      icon: Users,
      title: "Patient records",
      body: "Visit history, prescriptions, lab reports, and X-rays searchable from any device.",
    },
    {
      icon: MessageSquare,
      title: "Feedback flow",
      body: "Post-visit feedback link routes happy patients to Google and complaints internally.",
    },
    {
      icon: Globe,
      title: "Branded profile",
      body: "Public clinic profile on your domain with ratings, services, and inquiry capture.",
    },
    {
      icon: BarChart3,
      title: "Reports",
      body: "Lead response, bookings, no-shows, review trend, and source performance in one view.",
    },
  ];
  return (
    <section className="bg-white py-20 md:py-28" id="features">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <SectionHeader
          eyebrow="Everything you need"
          title="One panel. The whole funnel."
          subtitle="Built for growing clinics - every feature connects to patients, appointments, or trust."
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
/* Product screenshots                                                         */
/* -------------------------------------------------------------------------- */

function ProductScreenshots() {
  return (
    <section className="bg-white pb-20 md:pb-28">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Real clinic workflows, not another spreadsheet.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
              Your team sees leads, appointments, WhatsApp activity, patient
              records, and review requests in one operational dashboard.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ScreenshotCard
              icon={ClipboardList}
              title="Lead dashboard"
              body="Patient source, status, owner, and next follow-up visible at a glance."
            />
            <ScreenshotCard
              icon={MessageSquare}
              title="WhatsApp preview"
              body="Inquiry, auto-reply, booking link, reminder, and review request in sequence."
            />
            <ScreenshotCard
              icon={Calendar}
              title="Appointment view"
              body="Bookings, reminders, no-show status, and patient records connected."
            />
            <ScreenshotCard
              icon={Star}
              title="Review workflow"
              body="Google review requests and private feedback issues tracked separately."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ScreenshotCard({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4 flex h-24 items-end rounded-lg border border-slate-200 bg-white p-3">
        <div className="w-full space-y-2">
          <div className="h-2 w-2/3 rounded-full bg-slate-200" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-8 rounded-md bg-indigo-100" />
            <div className="h-8 rounded-md bg-emerald-100" />
            <div className="h-8 rounded-md bg-amber-100" />
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100" />
        </div>
      </div>
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Icon size={17} />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Who this is for                                                             */
/* -------------------------------------------------------------------------- */

function WhoThisIsFor() {
  const clinics = [
    ["Dental Clinics", "Reduce missed appointments and automate patient recalls."],
    ["Skin Clinics", "Capture high-intent enquiries for aesthetics and procedures."],
    ["Physiotherapy Clinics", "Keep treatment plans and follow-ups moving on time."],
    ["IVF Clinics", "Respond faster to sensitive, high-value patient inquiries."],
    ["Cosmetic Clinics", "Turn ad leads into consultations with fewer manual calls."],
    ["Multi-doctor Clinics", "Give managers one pipeline across doctors and staff."],
  ];

  return (
    <section className="bg-slate-50 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <SectionHeader
          eyebrow="Clinic fit"
          title="Built for growing clinics"
          subtitle="Best for clinics where every missed lead or weak review costs real revenue."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clinics.map(([title, body]) => (
            <div
              key={title}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Heart size={17} />
              </span>
              <h3 className="mt-3 text-base font-semibold text-slate-900">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {body}
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
    { label: "Essential plan", value: "− ₹9,999" },
    { label: "Net gain / month", value: "₹95,001", emphasis: true },
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
              ~10× ROI in the average month.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-300">
              For a clinic spending ₹50k/mo on ads, recovering even 20% of
              currently-lost leads is enough to pay back the Essential plan{" "}
              <span className="font-semibold text-white">10 times over</span>.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              The math gets stronger for high-LTV specialties — dental
              implants, fertility, cosmetic surgery, hair restoration — where
              one converted patient covers a full year of subscription.
            </p>
            <Link
              href={DEMO_HREF}
              className="mt-7 inline-flex items-center gap-1.5 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Book Free Demo
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
/* Onboarding                                                                  */
/* -------------------------------------------------------------------------- */

function Onboarding() {
  const steps = [
    ["01", "WhatsApp setup", "We connect your WhatsApp Business flow and demo messages."],
    ["02", "GMB optimization", "Your Google Business Profile is checked for trust gaps."],
    ["03", "Workflow setup", "Lead, reminder, booking, and review flows are mapped to your clinic."],
    ["04", "Staff training", "Reception and managers learn the daily operating rhythm."],
    ["05", "Launch & support", "We sit through the first real leads and fix issues quickly."],
  ];

  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <SectionHeader
          eyebrow="Onboarding"
          title="Go live in 7 days"
          subtitle="No technical setup for your team. We configure, train, launch, and support the first week."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-5">
          {steps.map(([n, title, body]) => (
            <div
              key={title}
              className="rounded-xl border border-slate-200 bg-slate-50 p-5"
            >
              <p className="text-xs font-bold tracking-widest text-indigo-600">
                {n}
              </p>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">
                {title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Add-ons                                                                     */
/* -------------------------------------------------------------------------- */

function Addons() {
  return (
    <section
      className="relative overflow-hidden bg-slate-950 py-20 text-white md:py-28"
      id="addons"
    >
      {/* Subtle grid backdrop for visual interest. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 [mask-image:linear-gradient(to_bottom,white,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(99,102,241,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(99,102,241,0.12) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 md:px-8">
        <div className="grid items-end gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <h2 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Online visibility{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Add-ons
              </span>
            </h2>
            <p className="mt-3 text-base italic text-slate-400">
              Add patient acquisition support when you want more demand on top
              of the clinic automation system.
            </p>
          </div>

          {/* Email marketing — small accented card */}
          <div className="rounded-2xl border-2 border-indigo-400/60 bg-slate-900/60 p-5 ring-1 ring-indigo-500/20">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300">
              Patient Email Follow-ups
            </p>
            <p className="mt-2 text-2xl font-bold text-white">
              ₹599 <span className="text-sm font-normal text-slate-400">/ 1000 clients</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Includes feedback &amp; review follow-ups
            </p>
          </div>
        </div>

        {/* Ads tier */}
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <AdCard label="Google Search Ads" price="₹5,999" extra="+ 5% of ad budget" />
          <AdCard label="Meta (FB / Insta) Ads" price="₹5,999" extra="+ 5% of ad budget" />
          <AdCard label="YouTube / Video Ads" price="₹9,999" extra="+ 5% of ad budget" />
        </div>

        {/* SMM tier */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <SmmCard
            label="SMM Basic"
            accent="from-blue-400 to-blue-600"
            price="₹2,999"
            cadence="/mo"
            features={["2 channels", "2 posts / week / channel", "1 reel / week"]}
          />
          <SmmCard
            label="SMM Intermediate"
            accent="from-violet-400 to-fuchsia-500"
            price="₹5,999"
            cadence="/mo"
            features={["4 channels", "2 posts / week / channel", "1 reel / week"]}
          />
          <SmmCard
            label="SMM Advanced"
            accent="from-amber-400 to-orange-500"
            price="₹9,999"
            cadence="/mo"
            features={["5 channels", "4 posts / week / channel", "3 reels / week"]}
          />
        </div>

        <p className="mt-12 text-center text-xs text-slate-500">
          Add-ons stack on top of any system plan. We keep the scope practical:
          patient acquisition, visibility, trust, and appointment growth.
        </p>

        <div className="mt-6 flex justify-center">
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            <MessageSquare size={14} />
            Talk on WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

function AdCard({
  label,
  price,
  extra,
}: {
  label: string;
  price: string;
  extra: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 backdrop-blur-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">{price}</p>
      <p className="mt-1 text-xs text-slate-400">{extra}</p>
    </div>
  );
}

function SmmCard({
  label,
  accent,
  price,
  cadence,
  features,
}: {
  label: string;
  accent: string;
  price: string;
  cadence: string;
  features: string[];
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 p-5 backdrop-blur-sm">
      {/* Top accent bar */}
      <div
        aria-hidden
        className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${accent}`}
      />
      <h3 className="text-lg font-bold text-white">{label}</h3>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-white">{price}</span>
        <span className="text-sm text-slate-400">{cadence}</span>
      </div>
      <ul className="mt-4 space-y-1.5 text-sm text-slate-300">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Switch comparison                                                           */
/* -------------------------------------------------------------------------- */

function Comparison() {
  const rows = [
    ["Manual follow-ups", "Automated"],
    ["Missed reviews", "Review workflows"],
    ["Multiple tools", "One system"],
    ["Slow lead response", "Instant WhatsApp replies"],
  ];

  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-6 md:px-8">
        <SectionHeader
          eyebrow="Why switch"
          title="Why clinics switch to ClinicEssential"
          subtitle="A simpler operating layer for reception, managers, and owners."
        />
        <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="grid grid-cols-2 bg-slate-50 text-sm font-bold text-slate-900">
            <div className="border-r border-slate-200 p-4">
              Traditional Setup
            </div>
            <div className="p-4">ClinicEssential</div>
          </div>
          {rows.map(([before, after]) => (
            <div key={before} className="grid grid-cols-2 border-t border-slate-200">
              <div className="border-r border-slate-200 p-4 text-sm text-slate-600">
                {before}
              </div>
              <div className="flex items-center gap-2 p-4 text-sm font-semibold text-slate-900">
                <CheckCircle2 size={15} className="text-emerald-600" />
                {after}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* FAQ                                                                         */
/* -------------------------------------------------------------------------- */

function Faq() {
  const items = [
    {
      q: "Will this work with my existing receptionist?",
      a: "Yes. ClinicEssential supports your receptionist by handling instant replies, reminders, and review prompts. Your staff still manages real patient conversations.",
    },
    {
      q: "Do patients need an app?",
      a: "No. Patients interact through WhatsApp links and messages. No patient app installation is required.",
    },
    {
      q: "Can this work with WhatsApp Business?",
      a: "Yes. We set up the WhatsApp-first workflow around your clinic's preferred WhatsApp Business process and the provider you use.",
    },
    {
      q: "How long does setup take?",
      a: "Most clinics can go live in 7 days. Setup includes WhatsApp flow setup, GMB checks, workflow configuration, staff training, and launch support.",
    },
    {
      q: "Will this improve Google reviews?",
      a: "It improves the review process. Happy patients get guided to Google after visits, while unhappy patients can be handled privately before the issue becomes public.",
    },
    {
      q: "Can multiple doctors use it?",
      a: "Yes. Multi-doctor clinics can manage leads, appointments, patients, and reviews across doctors from one shared operating panel.",
    },
    {
      q: "What if our ad spend is below ₹50k/month?",
      a: "You can still use it, but the value is strongest when lead volume is high enough that missed replies and missed reviews cost real money.",
    },
    {
      q: "What's the difference between Essential, Growth, and Power?",
      a: "Essential covers WhatsApp follow-ups, booking, and review workflows. Growth adds visibility and patient communication support. Power is for multi-doctor or multi-branch clinics that need custom workflows.",
    },
    {
      q: "Can I cancel any time?",
      a: "Yes — all monthly plans run month-to-month. The setup fee is one-time and non-refundable since it covers real onboarding work. Your data is always yours; we'll export it whenever you ask.",
    },
    {
      q: "Are add-ons required?",
      a: "No — every system plan stands on its own. Add-ons (ads management, SMM, email marketing) are optional and stack on top whenever you're ready. Larger combos get priority pricing — talk to us.",
    },
  ];
  return (
    <section className="bg-slate-50 py-20 md:py-28" id="faq">
      <div className="mx-auto max-w-3xl px-6 md:px-8">
        <SectionHeader
          eyebrow="Common questions"
          title="Things every clinic asks."
          subtitle="Simple answers for owners, managers, and front-desk teams."
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
              <Calendar size={12} />
              Go live in 7 days
            </span>
            <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl">
              Capture more patients without adding more front-desk chaos.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-indigo-100">
              ClinicEssential helps your clinic reply faster, book cleaner,
              remind patients on time, and collect more Google reviews.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <PrimaryCta inverted className="px-6 py-3.5" />
              <a
                href={WHATSAPP_HREF}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                <MessageSquare size={14} />
                Talk on WhatsApp
              </a>
            </div>
            <p className="mt-6 text-xs text-indigo-200">
              No app required for patients. Setup and staff training included.
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
              C
            </span>
            <div>
              <p className="text-sm font-bold tracking-wide text-slate-900">
                ClinicEssential
              </p>
              <p className="text-[11px] text-slate-500">
                WhatsApp-first clinic growth system for India
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
            <a href="#addons" className="hover:text-slate-900">
              Add-ons
            </a>
            <a href="#faq" className="hover:text-slate-900">
              FAQ
            </a>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Talk on WhatsApp
            </a>
          </div>
        </div>

        <div className="mt-8 grid gap-3 border-t border-slate-200 pt-6 text-[11px] text-slate-500 md:grid-cols-2">
          <div>
            <p>Company address: Add your registered office address</p>
            <p>GSTIN: Add GSTIN</p>
          </div>
          <div className="md:text-right">
            <p>Support: support@clinicessential.in</p>
            <p>Phone: 080 4713 7030</p>
            <p className="mt-2">
              Privacy policy · Terms · Refund policy
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} ClinicEssential. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function FloatingWhatsAppCta() {
  return (
    <a
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noreferrer"
      aria-label="Talk on WhatsApp"
      className="group fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-emerald-900/20 transition hover:bg-emerald-700 sm:px-5"
    >
      <MessageSquare size={18} />
      <span>Book Free Demo</span>
      <span className="hidden border-l border-white/25 pl-2 text-xs font-medium text-emerald-50 group-hover:inline">
        Talk on WhatsApp
      </span>
    </a>
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
