# Claude / AI Design Prompt — VGAII Catalog + Pitch Deck

Paste the relevant section below into Claude (or any other AI design tool — Gamma, Tome, Beautiful.ai, Figma's AI, ChatGPT-with-design-skills) to generate first drafts of the visual sales assets.

Two assets covered:
1. **Catalog (brochure)** — a 4–6 page PDF the founder hands a doctor at a conference or attaches to a cold WhatsApp.
2. **Pitch deck** — a 12-slide deck used in screen-shared discovery/demo calls.

Both share the same brand. Generate the brand brief once, then run the asset prompts.

---

## Section 1 — Brand brief (paste this first; the AI will use it as context for everything below)

> ### Brand brief — VGAII
>
> **Name:** VGAII (pronounced "vee-jai")
> **Tagline candidates** (pick whichever lands):
> - *"Your patients, captured."*
> - *"AI keeps your leads in the loop. Bad reviews stay internal."*
> - *"Every lead. Every review. One system."*
> - *"More patients. Better reviews. Less paperwork."*
> - *"Run the practice. We'll run the funnel."*
>
> **What we do:** A patient-acquisition + reputation system for ad-running medical/dental clinics in India. We sit between Google/Meta ads and the clinic's calendar with two distinguishing capabilities:
>
> 1. **AI automations behind the scenes** that keep every lead in the loop — auto-acknowledge on capture, follow-up nudges on the right cadence, smart routing, re-engagement on stale leads. Lead slip-through drops dramatically.
> 2. **Reputation gating** — after every visit, a private feedback link decides where the review goes. 4–5 stars are guided to Google. 1–2 stars stay internal so the clinic can fix the problem before it goes public.
>
> Plus: lead capture, Cal.com booking, patient records (with prescriptions/labs/X-rays), branded public profile on a custom domain, and a reports panel.
>
> **Audience:** Owners of multi-doctor clinics in India spending ≥ ₹50,000/month on ads, in specialties with high LTV per patient (dental implants, fertility, cosmetic surgery, dermatology aesthetics). The reader is usually the practice manager or the doctor's spouse — not the doctor themselves. They are pragmatic, time-poor, and skeptical of marketing-speak.
>
> **Tone of voice:**
> - Plainspoken. No buzzwords. No "AI-powered," no "revolutionary," no "best-in-class."
> - Confident, not loud. We don't promise miracles; we promise math.
> - Numbers in headlines beat adjectives. "Recover 35% of lost leads" > "Maximize your funnel."
> - Indian English, second-person (you / your).
>
> **Visual direction:**
> - Clean, modern, almost editorial. Closer to Stripe's marketing pages than typical Indian SaaS.
> - **Primary color:** indigo `#4F46E5` (matches the in-product UI).
> - **Accent colors:** emerald `#10B981` (positive metrics), amber `#F59E0B` (rating stars), slate `#475569` (body text), white backgrounds.
> - Typography: a clean modern sans (Inter, Geist, or Söhne if available). Headlines bold, body regular, plenty of whitespace.
> - **Imagery:** subtle, not stocky. Real product screenshots > illustrations of "happy doctors." If illustrations are needed, use simple flat icon-style line art in indigo on white, never busy 3D renders.
> - **No flexes:** no rocket emojis, no growth arrows, no fake-looking testimonials.
>
> **What to avoid in every asset:**
> - Stock photos of smiling doctors with stethoscopes.
> - Generic SaaS phrases ("streamline," "leverage," "synergy," "empower").
> - Putting our logo on every slide. Once on the cover and once on the closing slide is enough.
> - Walls of text. If a slide needs more than 30 words of body copy, it's two slides.
>
> Confirm you've read this brief before I share the asset prompt.

---

## Section 2 — Catalog (4–6 page PDF)

> ### Asset request — Catalog
>
> Design a 4–6 page PDF brochure ("catalog") for VGAII. A4 portrait, designed to be readable on a phone screen as well as printed. Use the brand brief above.
>
> Use the brochure to take a clinic owner from "what is this?" to "I want a demo" in two minutes of skimming.
>
> **Page-by-page structure:**
>
> **Page 1 — Cover**
> - Bold headline: "Your patients, captured." (or whichever tagline we picked)
> - Sub-headline: one line — "A patient-acquisition and reputation system for ad-running clinics."
> - Indigo gradient or white background. Logo top-left, page number suppressed.
> - Visual: one product screenshot, framed in a soft device mockup. The Reputation panel is the strongest screenshot.
>
> **Page 2 — The problem**
> - Headline: "Every month, you're losing 30–50% of the leads you paid for."
> - Three short paragraphs (≤ 40 words each), each opening with a stat:
>   - *"₹X spent on ads. Y% of leads never get a callback within 24 hours."*
>   - *"Reviews come in randomly — bad ones go straight to Google before you even hear about them."*
>   - *"Your team manages patient records across WhatsApp, spreadsheets, and a notebook by the front desk."*
> - Subtle visual: a leaky-funnel illustration in flat indigo line art (no clip art, no emoji).
>
> **Page 3 — How VGAII works (1-page diagram)**
> - One landscape diagram showing the flow:
>   `Google/Meta ad → VGAII captures lead → Auto follow-up → Cal.com booking → Visit + records → Post-visit feedback → 5-star Google review (happy) OR private route (unhappy)`
> - Each step is a card with a one-line description. Indigo cards on white. Arrows in slate.
>
> **Page 4 — Features grid (6 tiles)**
> Six small cards, two rows of three. Each card: icon + 3-word title + 1-sentence description. The six features (the first two are the headliners — give them slightly more weight):
> 1. **AI lead loop** — Automations chase every lead with the right follow-up at the right time. Lead slip-through drops dramatically.
> 2. **Reputation gating** — Bad reviews never reach Google. 4–5 stars go public; 1–2 stars come to you privately so you can fix the issue.
> 3. **Lead capture** — Webhooks from Google Ads, Meta forms, landing pages — every lead in one CRM.
> 4. **Cal.com booking** — Patients book themselves; phone, name, time pre-filled.
> 5. **Patient records** — Visit history, prescriptions, lab reports — accessible from anywhere.
> 6. **Public profile + reports** — Branded site at your-clinic.com. Funnel, source attribution, no-show rate.
>
> **Page 5 — The numbers (the ROI page)**
> - Headline: "What this looks like for a clinic spending ₹50k/mo on ads"
> - A simple numbered table:
>   ```
>   Monthly ad spend                ₹50,000
>   Leads currently lost (~35%)     35
>   Patients recovered (20%)        7 / month
>   Avg revenue per patient          ₹15,000
>   Additional revenue / month       ₹1,05,000
>   VGAII cost                       ₹10,000
>   ──────────────────────────────────────────
>   Net gain / month                 ₹95,000
>   ```
> - Below: "Run your own numbers in 30 seconds — vgaii.in/roi" (with a QR code).
>
> **Page 6 — Pricing + CTA**
> - Three pricing cards (Annual, Monthly, 90-day pilot). Annual highlighted as "Recommended."
> - At the bottom, a single sentence: *"Talk to us — we'll show you a demo with your clinic's actual data."*
> - Call to action: WhatsApp number, email, website. QR code to book a demo.
>
> **Design constraints:**
> - Every page should be readable in 15 seconds.
> - Use real product screenshots wherever possible — I'll provide them.
> - Indigo and white are the dominant colors; emerald/amber only as accent.
> - Body text 11pt minimum (it'll be read on phones).
> - Generate output as: layout description per page (so I can pass to a designer in Figma) + actual copy ready to paste in.

---

## Section 3 — Pitch deck (13 slides)

> ### Asset request — Pitch deck
>
> Design a 13-slide pitch deck for VGAII used in screen-shared sales calls. 16:9, designed to be projected and to look good as a thumbnail. Use the brand brief above.
>
> The deck is **not** a leave-behind — it's the visual companion to a 20-minute conversation. It should support what the founder is saying, not replace it. Every slide ≤ 30 words.
>
> **Slide-by-slide structure:**
>
> **Slide 1 — Title**
> - "VGAII" + tagline. Subtitle: "[Prospect Clinic Name]" + date. Indigo gradient background.
>
> **Slide 2 — The leak (problem framing)**
> - Headline: "30–50% of your ad-driven leads never become patients."
> - Three sub-bullets in tight columns:
>   - "Missed calls"
>   - "Slow follow-up"
>   - "No system"
> - One subtle stat at the bottom in slate text: *"Industry average across 200+ clinics."*
>
> **Slide 3 — Where it leaks**
> - A horizontal funnel diagram showing typical conversion at each stage:
>   `Ad impressions → Clicks (X%) → Lead form (Y%) → Picked-up call (Z%) → Booked (W%) → Visited (V%) → Reviewed (R%)`
> - Highlight the "picked-up call" and "reviewed" steps in red — those are the leaks we close.
>
> **Slide 4 — The two big wins** *(this is the slide that has to land)*
> - Two large cards side by side, equal weight:
>   - Left card — "AI keeps your leads in the loop." Subtitle: "Auto-acknowledge, follow-up nudges, smart routing, re-engagement. Your team works from a clean to-do list, not a chaotic inbox." Visual: a small flat-line illustration of a loop / cycle in indigo.
>   - Right card — "No bad review goes directly to Google." Subtitle: "After every visit, a private feedback link. 4–5 stars go public. 1–2 stars come to you privately — so you can fix the issue before it becomes a public review." Visual: a flat-line illustration of a fork in the road, indigo.
> - Both cards anchored to indigo. Sub-headline above both: "Two stories you'll be telling your patients about for years."
>
> **Slide 5 — How it works (the flow)**
> - The same diagram as catalog page 3 but in landscape format and animated (each step appears on click).
>
> **Slide 6 — Reputation gating (zoom-in)**
> - Headline: "Where the review goes is decided *before* it's public."
> - Diagram showing the fork: `Visit → Private feedback link → if 4–5 ★ → "Leave a Google review" → public Google review` vs. `if 1–2 ★ → routes internally → owner gets WhatsApp ping → call back same day → fix the issue privately`.
> - Mini stat: "Clinics see +5 Google reviews/month within the first 60 days, with virtually no new 1–2 star public reviews." (Mark estimated until we have real data.)
>
> **Slide 7 — The AI lead loop (zoom-in)**
> - Headline: "Your receptionist isn't chasing leads. The AI is."
> - Three-step diagram:
>   1. **Capture** — lead arrives via webhook, instant auto-acknowledge to the patient.
>   2. **Loop** — follow-up nudges at smart cadences. If lead goes cold, re-engage. If hot, route to whichever staff member is free.
>   3. **Hand off** — once the patient replies / books, lead lands on the right human's desk with full context.
> - One supporting line: "The receptionist sees a clean to-do list, not 90 unread WhatsApps."
> - Visual: a small annotated screenshot of the leads list with auto-status badges.
>
> **Slide 8 — Lead capture in 60 seconds (live demo placeholder)**
> - Slide is mostly blank with a single line: "Live demo — your data."
> - Founder switches to the actual product here. Slide is a visual handoff.
>
> **Slide 9 — Reports + dashboard (screenshot)**
> - One large product screenshot of the Reports panel + Reputation panel.
> - Caption: "Monday-morning view. The owner sees this; the staff sees what they need to do this week."
>
> **Slide 10 — Built for Indian clinics, not adapted from US software**
> - Three points:
>   - "Cal.com / WhatsApp / Google Reviews — the tools you already use."
>   - "Custom domain on your own URL."
>   - "INR pricing. INR support. India-time response."
> - Subtle visual: small flag or mango or chai cup icon — only if it doesn't look kitschy. Otherwise no visual.
>
> **Slide 11 — The numbers, for [Prospect Clinic Name]**
> - The same ROI table as the proposal, with placeholder fields for the founder to fill in live.
> - "Conservative case" vs "Their case" — two columns.
>
> **Slide 12 — Pricing**
> - Three cards: Annual prepaid (highlighted), Monthly, 90-day pilot.
> - At the bottom: "Includes setup, training, and unlimited staff seats."
>
> **Slide 13 — What happens next**
> - Numbered: 1. Reply "go" 2. Kickoff in 48h 3. Live in 5 days 4. First report in week 2.
> - Founder name, photo, WhatsApp, email. QR code to book a demo.
>
> **Design constraints:**
> - 16:9, exported as PDF + editable Figma/Slides file.
> - Headline 32–40pt, body 18–22pt. Slate `#475569` for body text, indigo `#4F46E5` for headlines.
> - Every slide must be readable from a thumbnail in a Zoom call sidebar.
> - No more than 1 chart per slide. No more than 4 bullets per slide.
> - Don't include speaker notes in the slide body — generate separate speaker notes if asked.
> - When a screenshot is referenced, leave a labeled placeholder rectangle (I'll drop the actual screenshot in).
>
> **Generate output as:**
> 1. Slide-by-slide layout descriptions (so a designer can build them in Figma).
> 2. Actual copy for each slide (headline + body, ready to paste in).
> 3. A short list of 3–5 product screenshots I should capture from the live app to drop into the deck.

---

## Section 4 — How to use these prompts

1. **Open Claude (or your design AI of choice).**
2. **Paste Section 1 (the brand brief) first** as a single message. Wait for confirmation.
3. **Then paste Section 2 OR Section 3** — one asset per session works better than asking for both at once.
4. **Iterate.** First output is rarely the final. Push back on:
   - Slides that have too much text — ask for "≤ 20 words per slide."
   - Stock-photo-flavored imagery — ask for "no people; product screenshots only."
   - Marketing-speak headlines — ask for "rewrite with one specific number in the headline."
5. **Hand off the layout descriptions to a designer** (Figma) once the structure feels right. AI is great at structure and copy; it's weaker at typography and visual polish than a real designer.

## Variations to try once the v1 is done

- **Vertical-specific decks**: same structure, but specialty-specific stats and screenshots (dental implants version, IVF version, derm version). Each takes ~30 minutes to fork from the master.
- **Agency-partner version of the deck**: emphasize white-label, revenue split, retention benefit. Targets digital marketing agencies serving doctors.
- **Conference handout (1 page)**: a single A4 with QR code → demo signup. Cheaper than printing 50 brochures.

---

## Output files this prompt should produce

After running the prompts above through your AI of choice, you should end up with:

- `/sales/catalog/copy.md` — final copy for the brochure
- `/sales/catalog/layout.md` — page-by-page layout for the designer
- `/sales/deck/copy.md` — final copy for the deck
- `/sales/deck/layout.md` — slide-by-slide layout for the designer
- `/sales/deck/screenshots-needed.md` — list of product captures to take

The designer (Figma freelancer, ~₹15–25k for both assets) takes those four files and ships PDFs + editable source within a week.
