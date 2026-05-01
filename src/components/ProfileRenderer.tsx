import type { Profile } from "@/lib/validators/profile";
import ProfileContactForm from "@/components/ProfileContactForm";

const FALLBACK = {
  doctorName: "Dr. Jane Doe",
  specialty: "Cardiology",
  credentials: "MD, FACC",
  heroTitleLine1: "Compassionate care",
  heroTitleLine2: "for your heart.",
  heroTagline:
    "Providing state-of-the-art cardiovascular treatments with a patient-first approach. Your journey to a healthier heart starts here.",
  heroImageUrl:
    "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=1000",
  aboutImageUrl:
    "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=800",
  aboutBio:
    "With over 15 years of experience in clinical cardiology, the doctor is dedicated to preventing, diagnosing, and treating cardiovascular diseases.",
  achievements: [
    "Board Certified in Cardiovascular Disease",
    "MD from Harvard Medical School",
    "Fellow of the American College of Cardiology",
  ],
  servicesTitle: "Comprehensive Cardiac Care",
  servicesSubtitle:
    "Utilizing the latest technology and evidence-based medicine to provide optimal outcomes for our patients.",
  services: [
    {
      title: "Preventive Cardiology",
      description:
        "Comprehensive risk assessments, cholesterol management, and tailored lifestyle guidance to keep your heart healthy.",
    },
    {
      title: "Diagnostic Testing",
      description:
        "State-of-the-art non-invasive testing including stress tests, Holter monitors, and advanced echocardiography.",
    },
    {
      title: "Chronic Care",
      description:
        "Expert, long-term management of hypertension, arrhythmias, coronary artery disease, and heart failure.",
    },
  ],
  address: "123 Medical Center Drive, Suite 400\nHealthcare City, HC 12345",
  phone: "(555) 123-4567",
  hours: "Mon - Fri: 8:00 AM - 5:00 PM",
};

const orFallback = <T,>(v: T | undefined | null | "", fallback: T): T =>
  v === undefined || v === null || v === "" ? fallback : v;

const orFallbackArray = <T,>(v: T[] | undefined, fallback: T[]): T[] =>
  v && v.length ? v : fallback;

export default function ProfileRenderer({
  profile,
  ctaUrl,
  clientId,
  leadSource,
}: {
  profile: Partial<Profile>;
  ctaUrl?: string;
  clientId?: string;
  leadSource?: string;
}) {
  const v = {
    doctorName: orFallback(profile.doctorName, FALLBACK.doctorName),
    specialty: orFallback(profile.specialty, FALLBACK.specialty),
    credentials: orFallback(profile.credentials, FALLBACK.credentials),
    heroTitleLine1: orFallback(profile.heroTitleLine1, FALLBACK.heroTitleLine1),
    heroTitleLine2: orFallback(profile.heroTitleLine2, FALLBACK.heroTitleLine2),
    heroTagline: orFallback(profile.heroTagline, FALLBACK.heroTagline),
    heroImageUrl: orFallback(profile.heroImageUrl, FALLBACK.heroImageUrl),
    aboutImageUrl: orFallback(profile.aboutImageUrl, FALLBACK.aboutImageUrl),
    aboutBio: orFallback(profile.aboutBio, FALLBACK.aboutBio),
    achievements: orFallbackArray(profile.achievements, FALLBACK.achievements),
    servicesTitle: orFallback(profile.servicesTitle, FALLBACK.servicesTitle),
    servicesSubtitle: orFallback(
      profile.servicesSubtitle,
      FALLBACK.servicesSubtitle,
    ),
    services: orFallbackArray(profile.services, FALLBACK.services),
    address: orFallback(profile.address, FALLBACK.address),
    phone: orFallback(profile.phone, FALLBACK.phone),
    hours: orFallback(profile.hours, FALLBACK.hours),
  };

  const cta = ctaUrl || "#contact";
  const ctaIsExternal = ctaUrl && /^https?:\/\//.test(ctaUrl);

  return (
    <div className="bg-slate-50 font-sans text-gray-800 antialiased">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex shrink-0 items-center">
              <span className="text-2xl font-bold tracking-tight text-sky-700">
                {v.doctorName}
              </span>
              <span className="ml-2 hidden border-l border-gray-300 pl-2 text-sm text-gray-500 sm:block">
                {v.specialty}
              </span>
            </div>
            <div className="hidden space-x-8 md:flex">
              <a href="#about" className="font-medium text-gray-600 transition hover:text-sky-700">
                About
              </a>
              <a href="#services" className="font-medium text-gray-600 transition hover:text-sky-700">
                Specialties
              </a>
              <a href="#contact" className="font-medium text-gray-600 transition hover:text-sky-700">
                Contact
              </a>
            </div>
            <div>
              <a
                href={cta}
                target={ctaIsExternal ? "_blank" : undefined}
                rel={ctaIsExternal ? "noreferrer" : undefined}
                className="rounded-md bg-sky-700 px-6 py-2.5 font-semibold text-white shadow-md transition hover:bg-sky-500"
              >
                Book Appointment
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="relative z-10 bg-white px-4 pt-16 pb-8 sm:px-6 sm:pb-16 md:pb-20 lg:w-full lg:max-w-2xl lg:pt-24 lg:pb-28 lg:px-8 xl:pb-32">
            <main className="mx-auto mt-10 max-w-7xl sm:mt-12 md:mt-16 lg:mt-20 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
                  <span className="block">{v.heroTitleLine1}</span>
                  <span className="block text-sky-700">{v.heroTitleLine2}</span>
                </h1>
                <p className="mt-3 text-base text-gray-600 sm:mx-auto sm:mt-5 sm:max-w-xl sm:text-lg md:mt-5 md:text-xl lg:mx-0">
                  {v.heroTagline}
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <a
                      href={cta}
                      target={ctaIsExternal ? "_blank" : undefined}
                      rel={ctaIsExternal ? "noreferrer" : undefined}
                      className="flex w-full items-center justify-center rounded-md border border-transparent bg-sky-700 px-8 py-3 text-base font-medium text-white transition hover:bg-sky-500 md:py-4 md:text-lg"
                    >
                      Schedule Consultation
                    </a>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <a
                      href="#services"
                      className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-8 py-3 text-base font-medium text-gray-700 transition hover:bg-gray-50 md:py-4 md:text-lg"
                    >
                      Our Services
                    </a>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="h-56 w-full object-cover sm:h-72 md:h-96 lg:h-full lg:w-full"
            src={v.heroImageUrl}
            alt={v.doctorName}
          />
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="items-center lg:grid lg:grid-cols-2 lg:gap-16">
            <div className="mb-10 overflow-hidden rounded-lg shadow-xl lg:mb-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v.aboutImageUrl}
                alt={`${v.doctorName} portrait`}
                className="h-auto w-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-base font-semibold uppercase tracking-wide text-sky-700">
                About The Doctor
              </h2>
              <p className="mt-2 text-3xl font-extrabold leading-8 tracking-tight text-slate-900 sm:text-4xl">
                {v.doctorName}
                {v.credentials ? `, ${v.credentials}` : ""}
              </p>
              <p className="mt-4 whitespace-pre-line text-lg text-gray-600">
                {v.aboutBio}
              </p>
              <div className="mt-8 border-t border-gray-200 pt-6">
                <ul className="space-y-4">
                  {v.achievements.map((a, i) => (
                    <li key={i} className="flex items-start">
                      <svg
                        className="h-6 w-6 shrink-0 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="ml-3 text-base text-gray-700">{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="text-base font-semibold uppercase tracking-wide text-sky-700">
              Specialties
            </h2>
            <p className="mt-2 text-3xl font-extrabold leading-8 tracking-tight text-slate-900 sm:text-4xl">
              {v.servicesTitle}
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-xl text-gray-500">
              {v.servicesSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {v.services.map((s, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-100 bg-slate-50 p-8 shadow-sm transition duration-300 hover:shadow-lg"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-sky-700">
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
                <h3 className="mb-3 text-xl font-bold text-slate-900">
                  {s.title}
                </h3>
                <p className="text-gray-600">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-slate-900 py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-3xl font-extrabold tracking-tight">
                Get in Touch
              </h2>
              <p className="mb-8 text-lg text-gray-400">
                Ready to take control of your heart health? Contact our office
                to schedule your consultation today.
              </p>

              <div className="space-y-6">
                <div className="flex items-center">
                  <svg
                    className="mr-4 h-6 w-6 text-sky-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="whitespace-pre-line text-gray-300">
                    {v.address}
                  </span>
                </div>
                <div className="flex items-center">
                  <svg
                    className="mr-4 h-6 w-6 text-sky-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <span className="text-gray-300">{v.phone}</span>
                </div>
                <div className="flex items-center">
                  <svg
                    className="mr-4 h-6 w-6 text-sky-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-gray-300">{v.hours}</span>
                </div>
              </div>
            </div>

            {clientId ? (
              <ProfileContactForm clientId={clientId} source={leadSource} />
            ) : (
              <div className="rounded-lg bg-white p-8 text-sm text-gray-500 shadow-2xl">
                Form preview unavailable — pass a clientId to enable lead
                capture.
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-800 bg-gray-900 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} {v.doctorName} {v.specialty}. All
            rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
