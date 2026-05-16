// "Premium" — slate-900 / sky-600 accent. Mirrors
// html-template/doctor-profile-2.html. Distinct touches: pill buttons,
// frosted nav, rounded-3xl image cards, dotted-grid contact section.

import ProfileContactForm from "@/components/ProfileContactForm";
import { resolveProfile, type TemplateProps } from "./shared";

export default function PremiumTemplate({
  profile,
  ctaUrl,
  clientId,
  leadSource,
}: TemplateProps) {
  const v = resolveProfile(profile);
  const cta = ctaUrl || "#contact";
  const ctaIsExternal = ctaUrl && /^https?:\/\//.test(ctaUrl);

  return (
    <div className="bg-slate-50 font-sans text-slate-900 antialiased selection:bg-sky-600/10">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xl font-bold tracking-tight text-slate-900">
                {v.doctorName}
              </span>
              <span className="hidden rounded-full border border-slate-100 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-widest text-slate-400 sm:inline-block">
                {v.specialty}
              </span>
            </div>
            <div className="hidden space-x-10 md:flex">
              <a
                href="#about"
                className="text-sm font-medium tracking-wide text-slate-500 transition hover:text-slate-900"
              >
                About
              </a>
              <a
                href="#services"
                className="text-sm font-medium tracking-wide text-slate-500 transition hover:text-slate-900"
              >
                Specialties
              </a>
              <a
                href="#contact"
                className="text-sm font-medium tracking-wide text-slate-500 transition hover:text-slate-900"
              >
                Contact
              </a>
            </div>
            <div>
              <a
                href={cta}
                target={ctaIsExternal ? "_blank" : undefined}
                rel={ctaIsExternal ? "noreferrer" : undefined}
                className="rounded-full bg-slate-900 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-all duration-300 hover:bg-slate-700 hover:shadow active:scale-95"
              >
                Book Appointment
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 pt-16 pb-20 lg:grid-cols-2 lg:pt-28 lg:pb-32">
            <main className="z-10 mx-auto max-w-xl lg:mx-0">
              <div className="text-left">
                <h1 className="text-4xl font-light leading-[1.1] tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
                  {v.heroTitleLine1}
                  <br />
                  <span className="mt-2 block font-semibold text-sky-600">
                    {v.heroTitleLine2}
                  </span>
                </h1>
                <p className="mt-6 text-base leading-relaxed text-slate-500 sm:text-lg">
                  {v.heroTagline}
                </p>
                <div className="mt-10 flex flex-col justify-start gap-4 sm:flex-row">
                  <a
                    href={cta}
                    target={ctaIsExternal ? "_blank" : undefined}
                    rel={ctaIsExternal ? "noreferrer" : undefined}
                    className="flex items-center justify-center rounded-full bg-slate-900 px-8 py-4 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:bg-slate-700"
                  >
                    Schedule Consultation
                  </a>
                  <a
                    href="#services"
                    className="flex items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-4 text-sm font-medium text-slate-600 transition-all duration-300 hover:bg-slate-50"
                  >
                    Our Services
                  </a>
                </div>
              </div>
            </main>
            <div className="relative h-[450px] w-full overflow-hidden rounded-3xl border border-slate-100 shadow-2xl shadow-slate-100 lg:h-[600px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="h-full w-full object-cover"
                src={v.heroImageUrl}
                alt={v.doctorName}
              />
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div className="overflow-hidden rounded-3xl border border-white bg-white p-3 shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v.aboutImageUrl}
                alt={`${v.doctorName} portrait`}
                className="h-[500px] w-full rounded-2xl object-cover"
              />
            </div>
            <div>
              <h2 className="mb-4 inline-block rounded-full bg-sky-600/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-sky-600">
                About The Doctor
              </h2>
              <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {v.doctorName}
                {v.credentials ? `, ${v.credentials}` : ""}
              </p>
              <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-slate-600">
                {v.aboutBio}
              </p>
              <div className="mt-10 border-t border-slate-200/60 pt-8">
                <ul className="space-y-4">
                  {v.achievements.map((a, i) => (
                    <li key={i} className="flex items-center">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-sky-600" />
                      <span className="ml-4 text-sm font-medium text-slate-700">
                        {a}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto mb-20 max-w-2xl text-center">
            <h2 className="mb-4 inline-block rounded-full bg-sky-600/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-sky-600">
              Specialties
            </h2>
            <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {v.servicesTitle}
            </p>
            <p className="mt-4 text-base text-slate-500">
              {v.servicesSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {v.services.map((s, i) => (
              <div
                key={i}
                className="group rounded-3xl border border-slate-100 bg-white p-8 transition-all duration-300 hover:border-slate-200 hover:bg-slate-50"
              >
                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-700 transition-colors group-hover:border-slate-200 group-hover:bg-white">
                  <svg
                    className="h-5 w-5 text-sky-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <h3 className="mb-3 text-lg font-semibold text-slate-900">
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-500">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="relative overflow-hidden bg-slate-950 py-24 text-white"
      >
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] opacity-20 [background-size:24px_24px]" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div>
              <h2 className="mb-4 text-3xl font-light tracking-tight sm:text-4xl">
                Get in Touch
              </h2>
              <p className="mb-10 max-w-md text-base leading-relaxed text-slate-400">
                Ready to take control of your heart health? Contact our office
                to schedule your consultation today.
              </p>

              <div className="space-y-8">
                <div className="flex items-start">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5">
                    <div className="h-1.5 w-1.5 rounded-full bg-sky-600" />
                  </div>
                  <span className="ml-4 whitespace-pre-line text-sm leading-relaxed text-slate-300">
                    {v.address}
                  </span>
                </div>
                <div className="flex items-start">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5">
                    <div className="h-1.5 w-1.5 rounded-full bg-sky-600" />
                  </div>
                  <span className="ml-4 text-sm text-slate-300">{v.phone}</span>
                </div>
                <div className="flex items-start">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5">
                    <div className="h-1.5 w-1.5 rounded-full bg-sky-600" />
                  </div>
                  <span className="ml-4 text-sm text-slate-300">{v.hours}</span>
                </div>
              </div>
            </div>

            {clientId ? (
              <ProfileContactForm
                clientId={clientId}
                source={leadSource}
                variant="premium"
              />
            ) : (
              <div className="rounded-3xl bg-white p-8 text-sm text-slate-500 shadow-2xl">
                Form preview unavailable — pass a clientId to enable lead
                capture.
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 bg-slate-950 py-10">
        <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
          <p className="text-xs leading-relaxed tracking-wide text-slate-500">
            © {new Date().getFullYear()} {v.doctorName} {v.specialty}. All
            rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
