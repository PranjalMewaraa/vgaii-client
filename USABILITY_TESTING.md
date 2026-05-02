# Usability Testing Guide

End-to-end checklists for every role and integration in the panel. Each item is a `- [ ]` checkbox so this doubles as a manual test pass.

---

## 0. Prerequisites

### 0.1 Reset the database

```bash
npm run seed:reset
```

This wipes and re-seeds two demo clients (Aarogya Dental Studio, PulseFit Wellness) plus all five test users. The console prints the webhook keys; copy them — you'll need them for the webhook tests.

### 0.2 Start the app

```bash
npm run dev
```

Browse to <http://localhost:3000>.

### 0.3 Test accounts

| Role | Email | Password | Modules |
|---|---|---|---|
| SUPER_ADMIN | `superadmin@test.local` | `Password@123` | — (full platform) |
| CLIENT_ADMIN (Dental) | `dental.admin@test.local` | `Password@123` | bypasses module checks |
| STAFF (Dental) | `dental.staff@test.local` | `Password@123` | `leads, patients, appointments` |
| CLIENT_ADMIN (Fitness) | `fitness.admin@test.local` | `Password@123` | bypasses module checks |
| STAFF (Fitness) | `fitness.staff@test.local` | `Password@123` | `feedback` only |

### 0.4 External-service notes

- **Cal.com** — needed for the lead → appointment_booked auto-bump. Configure a real Cal.com booking URL on the dental client (`/settings`), or skip the embed-rendering test and use the curl webhook instead.
- **DataForSEO** — needed for the BusinessInfoCard auto-populate. Account verification must be complete (you'll see this in `[business-info] self-heal failed` server logs if not).

### 0.5 Use multiple browser sessions

Open at least **three** browser sessions (regular + two incognito windows) so you can hold a SUPER_ADMIN, CLIENT_ADMIN, and STAFF context simultaneously and watch the cross-impact.

---

## 1. Smoke

- [ ] **Login (happy path)** — `dental.admin@test.local` + `Password@123` → lands on `/`. Sidebar appears.
- [ ] **Login (wrong password)** — same email, password `wrong` → red banner "Invalid email or password". Doesn't redirect.
- [ ] **Logout** — click Logout in topbar → returns to `/login`. `/leads` after logout → redirected to `/login?next=/leads`.
- [ ] **404** — visit `/this-doesnt-exist` → flat indigo 404 page with "Back to dashboard".
- [ ] **403** — login as `dental.staff@test.local`, type `/staff` directly in URL → "You don't have access" page inside the app shell.

---

## 2. SUPER_ADMIN

Login as `superadmin@test.local`.

### 2.1 Sidebar & overview

- [ ] Sidebar shows only **Overview** and **Clients**. No Leads/Patients/etc.
- [ ] `/` shows **Platform overview** — stat cards for clients (total/active/trial/expired), users, leads (today/this-week/visited/lost), appointments, feedback.
- [ ] Numbers are non-zero where the seed has data (2 clients, 5 leads, etc.).
- [ ] **Manage clients →** button at top right links to `/admin/clients`.

### 2.2 Clients hierarchy

- [ ] `/admin/clients` lists Aarogya Dental and PulseFit.
- [ ] Each row shows subscription pill (active/trial), plan pill, summary line: `N staff · N leads · N appts · N open feedback`.
- [ ] Click a row → expands to show the **Client Admin** card and **Staff (n)** sub-card with assigned-module pills.
- [ ] Footer links: "View public profile →" appears only if `profileSlug` is set.

### 2.3 Create a client (atomic Client + Admin)eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzc3NjQ5NTQzLCJqdGkiOiI5YjNkZTVjZS1hYWUyLTQzMGYtYTBjZi05NTJkZDc3NzZjMTciLCJ1c2VyX3V1aWQiOiJkNDhkYjYyYS1kZTc4LTRhMTctODMwMS1hNGExYTZiNzk3MWIiLCJzY29wZSI6IndlYmhvb2tzOnJlYWQgd2ViaG9va3M6d3JpdGUgYXZhaWxhYmlsaXR5OnJlYWQgYXZhaWxhYmlsaXR5OndyaXRlIGV2ZW50X3R5cGVzOnJlYWQgZXZlbnRfdHlwZXM6d3JpdGUgbG9jYXRpb25zOnJlYWQgcm91dGluZ19mb3JtczpyZWFkIHNoYXJlczp3cml0ZSBzY2hlZHVsZWRfZXZlbnRzOnJlYWQgc2NoZWR1bGVkX2V2ZW50czp3cml0ZSBzY2hlZHVsaW5nX2xpbmtzOndyaXRlIn0.6rHKcdhsv-MFyw_hFOT8QWqfDYIAaZdFVzfAhaNnavY7Cf6klu4uGZsz6SQ5Dv9roXehuecpVDDW1QsxfwJsSg

- [ ] Click **+ New client** → form expands.
- [ ] Submit empty → browser/native validation prevents.
- [ ] Submit valid: client `Vivian Eye Care`, plan `Pro`, admin `Dr. Iqbal`, `iqbal@vivian.test`, password `Password@123` → form collapses, new row appears in the list.
- [ ] Expand the new row → admin shown, no staff yet, webhookKey is auto-generated (visible after impersonating the admin).
- [ ] Try creating with the same email again → red banner *"Email already in use"*. The Client is **not** created (rollback) — verify by counting clients.
- [ ] Try password shorter than 8 chars → form's `minLength` blocks; if bypassed via curl → 400 from Zod.

### 2.4 Impersonate CLIENT_ADMIN

- [ ] Expand Aarogya Dental → **Impersonate** on the admin row.
- [ ] Page reloads. Sidebar swaps to client nav (Dashboard/Leads/Patients/etc.). Topbar shows the admin's name + role badge `Client`.
- [ ] **Amber banner** appears: *"You are impersonating Dental Client Admin · Aarogya Dental Studio."* with **Stop impersonating** button.
- [ ] Navigate to `/leads` — see the dental client's leads.
- [ ] Navigate to `/admin/clients` — 403 page (you're now CLIENT_ADMIN, not SUPER_ADMIN).
- [ ] Click **Stop impersonating** → returns to `/admin/clients` as super admin. Banner gone.

### 2.5 Impersonate STAFF

- [ ] Expand Aarogya Dental → **Impersonate** on `dental.staff@test.local`.
- [ ] Sidebar shows only Dashboard / Leads / Patients / Appointments. Topbar role badge `Staff`.
- [ ] Type `/staff` (Team) in URL → 403.
- [ ] Type `/feedbacks` → 403 (no `feedback` module assigned).
- [ ] Stop impersonating → back to super admin.

### 2.6 Cannot impersonate another super admin

- [ ] Open dev console, run:
  ```js
  await fetch("/api/admin/impersonate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ userId: "<another super admin id>" }),
  }).then(r => r.json());
  ```
- [ ] Returns `{ error: "Cannot impersonate another super admin" }` with 400 status. (Currently only one super admin exists in seed, so simulate by creating one in DB if needed.)

---

## 3. CLIENT_ADMIN (Dental)

Login as `dental.admin@test.local`.

### 3.1 Sidebar

- [ ] Sees: Dashboard, Leads, Patients, Appointments, Feedbacks, **Team**, **Profile**, **Settings**.
- [ ] Module-gated items appear regardless of `assignedModules` (admin bypasses module checks).

### 3.2 Dashboard

- [ ] BusinessInfoCard shows the dental client's GMB info (rating + review count) once DataForSEO has run, or the "Connect your Google Business profile" empty state otherwise.
- [ ] Click **↻ Refresh** on the card → if account is verified, business info reloads; otherwise a `[403] Please verify your account before using the API.` error surfaces inline.
- [ ] Stat cards: Total Leads, Today Leads, Patients, Upcoming Appts, Open Issues.
- [ ] Subscription status pill at the bottom.

### 3.3 Settings

- [ ] `/settings` opens. Webhook key shown in a copy-able code block.
- [ ] **Header / Query toggle** on each webhook row works. Cal.com card defaults to **Query** mode.
- [ ] Click **Copy** on the webhook key → "Copied" appears for ~1.5s.
- [ ] Set Cal.com booking URL to a real event link (e.g. `https://cal.com/your-account/30min`) → save → green "Saved" banner.
- [ ] Set Profile slug to `aarogya-dental` → save. Try `Aarogya Dental` (uppercase + space) → red 400 *"Slug must be lowercase letters, digits, or hyphens"*.
- [ ] Set Custom domain to `aarogyadental.com` → save (no DNS needed for the validation step). Try `not a domain` → 400.
- [ ] Try setting profileSlug to one already used by another client → 409 *"That profileSlug is already in use"* (rollback works).

### 3.4 Profile editor + Preview

- [ ] `/profile` opens. Multi-section form: General, Hero, About, Services, Contact.
- [ ] Toggle **Enabled** off → save → green "Saved".
- [ ] Click **Preview ↗** → opens `/p/<clientId>` in new tab → 404 (profile disabled).
- [ ] Toggle Enabled back on → save → reload preview → renders.
- [ ] Fill in fields with realistic data (use the test dataset in chat history).
- [ ] Add 3 achievements via **+ Add achievement**. Remove the second one. Re-order by removing all and re-adding.
- [ ] Add 3 services. Remove last. Add another → cap is 8.
- [ ] Set faviconUrl → reload preview → browser-tab icon updates.
- [ ] Public preview URL works at both `/p/<clientId>` and `/p/aarogya-dental` (slug from 3.3).

### 3.5 Public profile metadata (SEO/OG)

- [ ] On preview, view page source → `<title>` is `Doctor Name | Specialty`, not `Create Next App`.
- [ ] `<meta property="og:title">`, `og:description`, `og:image`, `twitter:card` are present.
- [ ] Hero image URL serves over HTTPS and renders.

### 3.6 Team management

- [ ] `/staff` opens. Existing dental staff member is in the list.
- [ ] Add new staff: name `Maya R.`, email `maya@test.local`, password `Password@123`, modules `[leads, patients]` → row appears.
- [ ] Password helper: type 1 char → "7 more characters needed" amber. Type 8 chars → "✓ Looks good" green.
- [ ] Click **Edit modules** on Maya's row → toggle in `appointments` → Save → row updates.
- [ ] Click **Remove** on Maya → confirm → row removed.
- [ ] Try adding a staff with email already in use → 409 *"Email already in use"*.
- [ ] Try adding a staff with module `bogus` (via dev tools) → 400 from Zod (enum mismatch).

### 3.7 Leads list (read + filter)

- [ ] `/leads` shows seeded leads.
- [ ] Filter by status `qualified` → only matching leads.
- [ ] Filter by source `google-ads-form` → narrows.
- [ ] Click **Clear filters** when filters are active → resets.
- [ ] Click a row → opens lead detail.

### 3.8 Patients view

- [ ] `/patients` shows leads with `appointment_booked` or `visited` status, plus orphan Cal.com appointments tagged "Direct appointment".
- [ ] Click a lead-based patient → detail page with appointments + feedback.
- [ ] Direct-appointment row is not clickable (no detail link).

### 3.9 Feedbacks

- [ ] `/feedbacks` shows seeded feedback. Filter pills (all/open/resolved) work.
- [ ] Click **Mark resolved** on the open one → status flips to resolved. No reload needed.
- [ ] Click **View patient →** on a feedback that has a linked lead → goes to `/patients/<leadId>`.

---

## 4. STAFF — `dental.staff@test.local` (modules: leads, patients, appointments)

Login.

### 4.1 Sidebar gates

- [ ] Sees: Dashboard, Leads, Patients, Appointments. No Feedbacks/Team/Profile/Settings.
- [ ] Type `/feedbacks` directly → 403.
- [ ] Type `/settings` directly → 403.
- [ ] Type `/staff` directly → 403.

### 4.2 Lead state machine (the heart of the funnel)

Pick a lead with status `new` (e.g. `Rahul Mehta` if seed has it; otherwise create one via the public form first).

- [ ] **`new`** state shows two buttons in the **Next step** card: `Mark contacted` and `Mark lost`.
- [ ] Click **Mark contacted** → pill changes to `CONTACTED`. Buttons swap to `Mark qualified` + `Mark lost`.
- [ ] Click **Mark qualified** → pill `QUALIFIED`. Buttons: `Book appointment` (indigo) + `Mark lost`.
- [ ] **Direct URL skip attempt**: open dev console:
  ```js
  fetch(`/api/leads/<leadId>`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ status: "visited" }),
  }).then(r => r.json());
  ```
  Returns 400 *"Status cannot move from \"qualified\" to \"visited\""*.
- [ ] Click **Book appointment** → Cal.com embed loads inline below the Next-step card. (If booking URL not set in settings, an amber notice points to Settings.)
- [ ] Pick a slot in the embed, fill phone matching the lead's phone, confirm → Cal.com fires its `BOOKING_CREATED` webhook → server upserts an Appointment + auto-bumps Lead.status to `appointment_booked`. The `bookingSuccessfulV2` postMessage triggers a refresh and the page re-renders with the new state.
- [ ] **`appointment_booked`** state: buttons `Mark visited` and `Mark lost`.
- [ ] Click **Mark visited** → pill `VISITED`. Card collapses to *"This lead is visited — no further actions."*

### 4.3 Internal notes

- [ ] On a lead detail, type into **Internal notes** → **Save notes** enables.
- [ ] Save → toast/banner not used; just persistence. Reload → notes still there.

### 4.4 Appointments page

- [ ] `/appointments` lists upcoming appointments.
- [ ] Each row shows status pill (default `SCHEDULED`).
- [ ] Click **Mark completed** → pill flips to `COMPLETED`. Reopen button appears.
- [ ] Click **Reopen** → back to `SCHEDULED`.
- [ ] Click **No show** → pill flips red. Reopen back.
- [ ] Click **Add note** → inline textarea appears → type → **Save note** → text persists below the row.

### 4.5 Patients

- [ ] `/patients` lists patients (leads with appointments + orphans).
- [ ] Click into a lead-based patient → see lead info, status pill, list of appointments, list of feedback.

---

## 5. STAFF — `fitness.staff@test.local` (modules: feedback only)

Login.

- [ ] Sidebar shows only: Dashboard, Feedbacks.
- [ ] Type `/leads` directly → 403.
- [ ] Type `/patients` → 403.
- [ ] Type `/appointments` → 403.
- [ ] `/feedbacks` opens, can filter and mark resolved.

---

## 6. Public landing page (visitor — no login)

Logged out / fresh incognito.

### 6.1 ID-based URL

- [ ] Visit `/p/<dental client _id>` → renders the doctor profile (assuming it's enabled in 3.4).
- [ ] No sidebar, no topbar, no VGAII branding leaks.

### 6.2 Slug-based URL

- [ ] Visit `/p/aarogya-dental` → same page (slug resolved in [public-client.ts](src/lib/public-client.ts)).
- [ ] Visit `/p/random-not-set` → 404.

### 6.3 Lead-capture form

- [ ] Scroll to **Get in Touch** → fill name + phone + message → **Request Appointment**.
- [ ] Form flips to thank-you state.
- [ ] In another tab as `dental.admin`, refresh `/leads` → new lead appears with `source = website-profile`, status `new`, your message in the lead's **Internal notes** field on the detail page.
- [ ] Try with phone shorter than 10 chars → browser blocks (HTML5 minLength). If bypassed via curl → 400.

### 6.4 UTM source

- [ ] Visit `/p/aarogya-dental?utm_source=google-ads` → submit form.
- [ ] In `/leads`, the new lead's source is `website-profile:google-ads`.
- [ ] Filter by source on `/leads` to confirm it shows up under that exact value.

### 6.5 Disabled profile

- [ ] As dental.admin, toggle profile **Enabled** off → save.
- [ ] Visitor reloads `/p/aarogya-dental` → 404.

### 6.6 Custom domain (production-only)

Skip on localhost. In production:

- [ ] Add `aarogyadental.com` to `Client.customDomain`.
- [ ] Add the domain to the hosting platform's domain list.
- [ ] Configure DNS (A or CNAME) to point at the host.
- [ ] Visit `https://aarogyadental.com` → middleware rewrites to `/host/aarogyadental.com` → renders the profile.
- [ ] `<title>`, `og:image`, slug-style metadata all present.

---

## 7. Public feedback form (customer)

After 6.3, you have a `feedbackUrl` returned in the API response. Open it.

### 7.1 Submit feedback (rating < 3)

- [ ] Page header: *"We're sorry to hear that — what went wrong?"*
- [ ] Rating picker shows ONLY two options: ★ Poor, ★★ Below expectations.
- [ ] Pick 2 stars, type a comment, **Submit feedback** → green thank-you banner.
- [ ] Reload the same URL → *"You've already submitted feedback for this visit. Thank you!"* (single-use token).
- [ ] In `/feedbacks` as dental.admin → new row with rating 2, color-coded amber, status `OPEN`.
- [ ] In `/leads`, the corresponding lead has status auto-bumped to `visited` and `outcomeRating: 2`.

### 7.2 Reject ratings ≥ 3

- [ ] Open dev console on a fresh feedback URL:
  ```js
  fetch(`/api/feedback/public/<token>`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating: 4, reviewText: "great" }),
  }).then(r => r.json());
  ```
- [ ] Returns 400 *"Feedback only accepts ratings of 1 or 2"*.

### 7.3 Invalid token

- [ ] Visit `/feedback/totally-fake-token` → "Invalid link" red banner.

---

## 8. External webhook integrations

Replace `<key>` with the dental client's webhook key from the seed output.

### 8.1 Lead capture webhook

```bash
curl -X POST http://localhost:3000/api/webhooks/leads \
  -H "Content-Type: application/json" \
  -H "x-webhook-key: <key>" \
  -d '{"name":"Test Lead","phone":"9000099999","source":"google-ads"}'
```

- [ ] Returns 201 with `{ leadId, status: "new", feedbackUrl }`.
- [ ] In `/leads`, the new lead appears with source `google-ads`, status `new`.

### 8.2 Same — without key

- [ ] Drop the `x-webhook-key` header → 401 *"Missing webhook key"*.

### 8.3 Same — with wrong key

- [ ] Use `x-webhook-key: not-real` → 404 *"Invalid webhook key"*.

### 8.4 Lead status update webhook

```bash
curl -X PATCH http://localhost:3000/api/webhooks/leads/status \
  -H "Content-Type: application/json" \
  -H "x-webhook-key: <key>" \
  -d '{"phone":"9000099999","status":"contacted","note":"first call"}'
```

- [ ] 200 with `{ leadId, status: "contacted" }`.
- [ ] Reload `/leads` → status pill updated.
- [ ] Repeat with `status: "qualified"`. Then `status: "visited", outcomeRating: 5` → status moves, outcomeRating shows on lead detail.

### 8.5 Cal.com webhook (mock)

```bash
curl -X POST http://localhost:3000/api/webhooks/booking \
  -H "Content-Type: application/json" \
  -H "x-webhook-key: <key>" \
  -d '{
    "triggerEvent": "BOOKING_CREATED",
    "payload": {
      "startTime": "2026-06-15T10:30:00.000Z",
      "attendees": [{
        "name": "Test Lead",
        "email": "test@example.com",
        "phoneNumber": "9000099999"
      }]
    }
  }'
```

- [ ] 200 with `{ appointment }`.
- [ ] In `/appointments` → new row.
- [ ] In `/leads` → that lead's status is now `appointment_booked` (auto-bumped because phone matched).
- [ ] In `/patients` → lead appears as a patient.

### 8.6 Cal.com webhook — phone doesn't match any lead

```bash
curl -X POST http://localhost:3000/api/webhooks/booking \
  -H "x-webhook-key: <key>" \
  -H "Content-Type: application/json" \
  -d '{
    "triggerEvent": "BOOKING_CREATED",
    "payload": {
      "startTime": "2026-06-16T10:30:00.000Z",
      "attendees": [{
        "name": "Walk-in",
        "phoneNumber": "9555599999"
      }]
    }
  }'
```

- [ ] Appointment created with `leadId: null`.
- [ ] Appears in `/patients` with **Direct appointment** badge (violet).

### 8.7 Cal.com — non-create events ignored

- [ ] Repeat with `"triggerEvent": "BOOKING_CANCELLED"` → response `{ message: "ignored" }`. Nothing created.

---

## 9. Cross-role boundary tests (RBAC)

### 9.1 STAFF cannot escalate via API

Logged in as `dental.staff`.

- [ ] In dev console:
  ```js
  fetch("/api/admin/clients", {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  }).then(r => r.json());
  ```
  → 403 *"Forbidden"*.
- [ ] Same for `/api/admin/analytics`, `/api/admin/impersonate`, `/api/staff` (POST).

### 9.2 CLIENT_ADMIN cannot read another tenant

- [ ] Login as `dental.admin`. Open dev console:
  ```js
  fetch("/api/leads", {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  }).then(r => r.json()).then(d => console.log(d.leads.map(l => l.clientId)));
  ```
  → all leads have `clientId = <dental client _id>`. None from PulseFit.

### 9.3 STAFF can't create staff

- [ ] As `dental.staff`, dev console:
  ```js
  fetch("/api/staff", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ name: "X", email: "x@x.x", password: "Password@1", assignedModules: [] }),
  }).then(r => r.json());
  ```
  → 403.

### 9.4 Public profile/lead endpoints don't leak

- [ ] Logged out: `GET /p/<other client>` → if their profile is disabled, 404. Never returns a CLIENT_ADMIN's webhook key, regardless.
- [ ] `POST /api/p/<random-id>/lead` → 404 *"Page not active"*.

### 9.5 Module bypass attempts

As `fitness.staff` (only `feedback`):

- [ ] `GET /api/leads` → 403 *"Module access denied"*.
- [ ] `GET /api/appointments` → 403.
- [ ] `GET /api/patients` → 403.

---

## 10. Negative / edge cases

- [ ] **Token expired** — manually edit `localStorage.token` to an expired JWT → next API call returns 401, AuthGuard kicks user back to `/login`.
- [ ] **Stale impersonation** — start impersonation, manually clear `impersonator_token` from localStorage → banner disappears but user is stuck in impersonated identity. (Acceptable; logout fixes it.)
- [ ] **Slug collision** — two clients save the same `profileSlug` → second save returns 409, no duplicate written.
- [ ] **Custom domain collision** — same field, same behavior.
- [ ] **Public profile when DataForSEO down** — render still succeeds; BusinessInfoCard shows the empty state in admin, but the public landing page never depends on DataForSEO.
- [ ] **DataForSEO timeout** — `/api/dashboard` self-heal caps at 5s ([business-info.ts](src/lib/business-info.ts)). Disable network, hit dashboard → returns within 5s with cached or null businessInfo.
- [ ] **Cal.com calendar disconnected** — embed loads but the underlying calendar provider connection is broken. Reconnect from Cal.com → Apps → Calendar.
- [ ] **Reseed mid-session** — run `npm run seed:reset` while logged in → next API call may 404 the user's record → AuthGuard handles gracefully.

---

## 11. Performance + cleanup

- [ ] No console errors in any flow above.
- [ ] No `useEffect` setState lint warnings (verified by `npx eslint src`).
- [ ] No leaked VGAII branding on `/p/*` or `/feedback/*` public pages.
- [ ] After full test pass, run `npm run seed:reset` once more to leave a clean state.

---

## Reporting

If a step fails, capture:
1. The role/email you were logged in as
2. The exact URL or curl command
3. The actual response (status code + body) vs expected
4. Browser console errors and the dev-server terminal output

File issues with the section number from this document (e.g. "4.2 step 5 — Cal.com webhook didn't auto-bump status").
