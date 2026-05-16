// "Clinical" — deep teal / forest, bright mint accents, sharper square
// corners, side-stacked hero card. Mirrors
// html-template/doctor-profile-3.html.

import ProfileContactForm from "@/components/ProfileContactForm";
import { resolveProfile, type TemplateProps } from "./shared";

export default function ClinicalTemplate({
  profile,
  ctaUrl,
  clientId,
  leadSource,
}: TemplateProps) {
  const v = resolveProfile(profile);
  const cta = ctaUrl || "#contact";
  const ctaIsExternal = ctaUrl && /^https?:\/\//.test(ctaUrl);

  return (
    <div className="bg-white font-sans text-stone-800 antialiased">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-teal-100/50 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex shrink-0 items-center">
              <span className="text-2xl font-extrabold tracking-tight text-emerald-950">
                {v.doctorName}
              </span>
              <span className="ml-3 hidden rounded bg-teal-50 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-teal-700 sm:block">
                {v.specialty}
              </span>
            </div>
            <div className="hidden space-x-8 md:flex">
              <a
                href="#about"
                className="text-sm font-semibold text-stone-600 transition hover:text-teal-700"
              >
                About
              </a>
              <a
                href="#services"
                className="text-sm font-semibold text-stone-600 transition hover:text-teal-700"
              >
                Specialties
              </a>
              <a
                href="#contact"
                className="text-sm font-semibold text-stone-600 transition hover:text-teal-700"
              >
                Contact
              </a>
            </div>
            <div>
              <a
                href={cta}
                target={ctaIsExternal ? "_blank" : undefined}
                rel={ctaIsExternal ? "noreferrer" : undefined}
                className="rounded bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-700/10 transition duration-200 hover:bg-teal-800"
              >
                Book Appointment
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-teal-50/40 py-12 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <main className="z-10 lg:col-span-7">
              <div className="mx-auto max-w-xl lg:mx-0">
                <h1 className="text-4xl font-extrabold leading-tight text-emerald-950 sm:text-5xl md:text-6xl">
                  {v.heroTitleLine1}{" "}
                  <span className="font-normal italic text-teal-700">
                    {v.heroTitleLine2}
                  </span>
                </h1>
                <p className="mt-4 text-base leading-relaxed text-stone-600 sm:text-lg md:text-xl">
                  {v.heroTagline}
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <a
                    href={cta}
                    target={ctaIsExternal ? "_blank" : undefined}
                    rel={ctaIsExternal ? "noreferrer" : undefined}
                    className="flex items-center justify-center rounded bg-teal-700 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-teal-700/20 transition hover:bg-teal-800"
                  >
                    Schedule Consultation
                  </a>
                  <a
                    href="#services"
                    className="flex items-center justify-center rounded border border-stone-200 bg-white px-6 py-3.5 text-base font-bold text-stone-700 transition hover:bg-stone-50"
                  >
                    Our Services
                  </a>
                </div>
              </div>
            </main>
            <div className="relative h-[350px] w-full lg:col-span-5 lg:h-[500px]">
              <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-2xl bg-teal-700/10" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="relative z-10 h-full w-full rounded-2xl border-4 border-white object-cover shadow-lg"
                src={v.heroImageUrl}
                alt={v.doctorName}
              />
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section
        id="about"
        className="border-b border-stone-100 bg-white py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border-2 border-stone-100 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v.aboutImageUrl}
                alt={`${v.doctorName} portrait`}
                className="h-[450px] w-full object-cover"
              />
            </div>
            <div>
              <h2 className="mb-3 border-l-4 border-teal-700 pl-3 text-xs font-extrabold uppercase tracking-widest text-teal-700">
                About The Doctor
              </h2>
              <p className="text-3xl font-extrabold tracking-tight text-emerald-950 sm:text-4xl">
                {v.doctorName}
                {v.credentials ? `, ${v.credentials}` : ""}
              </p>
              <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-stone-600">
                {v.aboutBio}
              </p>
              <div className="mt-6 pt-6">
                <ul className="grid grid-cols-1 gap-3">
                  {v.achievements.map((a, i) => (
                    <li key={i} className="flex items-start">
                      <span className="mt-0.5 rounded bg-teal-100 p-0.5 text-teal-700">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                      <span className="ml-3 text-sm font-medium text-stone-700">
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
      <section id="services" className="bg-teal-50/40 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 max-w-3xl">
            <h2 className="mb-3 border-l-4 border-teal-700 pl-3 text-xs font-extrabold uppercase tracking-widest text-teal-700">
              Specialties
            </h2>
            <p className="text-3xl font-extrabold tracking-tight text-emerald-950 sm:text-4xl">
              {v.servicesTitle}
            </p>
            <p className="mt-2 text-base text-stone-600">
              {v.servicesSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {v.services.map((s, i) => (
              <div
                key={i}
                className="rounded-xl border border-teal-100/50 bg-white p-8 shadow-sm transition duration-300 hover:border-teal-700/30"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded bg-teal-700 text-white shadow-md shadow-teal-700/20">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-xl font-bold text-emerald-950">
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-stone-600">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-emerald-950 py-24 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 className="mb-4 text-3xl font-extrabold tracking-tight">
                Get in Touch
              </h2>
              <p className="mb-8 text-base leading-relaxed text-teal-200/70">
                Ready to take control of your heart health? Contact our office
                to schedule your consultation today.
              </p>

              <div className="space-y-6 border-l-2 border-teal-800 pl-6">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-teal-400">
                    Clinic Address
                  </p>
                  <span className="whitespace-pre-line text-sm text-stone-300">
                    {v.address}
                  </span>
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-teal-400">
                    Phone Number
                  </p>
                  <span className="text-sm text-stone-300">{v.phone}</span>
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-teal-400">
                    Hours of Operation
                  </p>
                  <span className="text-sm text-stone-300">{v.hours}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              {clientId ? (
                <ProfileContactForm
                  clientId={clientId}
                  source={leadSource}
                  variant="clinical"
                />
              ) : (
                <div className="rounded-xl bg-white p-8 text-sm text-stone-500 shadow-xl">
                  Form preview unavailable — pass a clientId to enable lead
                  capture.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-900 bg-stone-950 py-10">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs text-stone-500">
            © {new Date().getFullYear()} {v.doctorName} {v.specialty}. All
            rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
