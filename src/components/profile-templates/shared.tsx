// Plumbing every doctor-profile template shares.
//
// Each template gets a fully-resolved `Resolved` (placeholders filled in
// from FALLBACK), so the rendering code doesn't need any null/empty
// guards. Add a new field once here, and every template inherits it.

import type { Profile } from "@/lib/validators/profile";

export const FALLBACK = {
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

export type Resolved = ReturnType<typeof resolveProfile>;

export const resolveProfile = (profile: Partial<Profile>) => ({
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
});

// Common props every template renderer accepts. The two callsites
// (/p/[clientId] + /host/[host]) thread the same values in.
export type TemplateProps = {
  profile: Partial<Profile>;
  ctaUrl?: string;
  clientId?: string;
  leadSource?: string;
};
