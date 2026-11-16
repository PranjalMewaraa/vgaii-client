# hosted-site

A **single static site** (`index.html` + `config.js`) that renders one clinic's
public website. No build step, no framework — HTML + Tailwind (CDN) + vanilla JS.

You deploy **one copy per client**. The only file that differs between clients
is `config.js`, which carries that client's id. The **design is chosen by the
client in the CRM dashboard** (Profile → Template) and returned by the API — the
site never hard-codes which template to show.

## How it works

1. `config.js` sets the client id and CRM URL for this deployment.
2. On load, `index.html` calls `GET {crmBase}/api/public/profile?id=<clientId>`.
3. The API returns the profile data **and** `template` (the design the client
   picked in the dashboard).
4. The matching design renders; the contact form posts leads back to the CRM.

```js
// config.js  — the only per-client file
window.SITE_CONFIG = {
  clientId: "clx123...",            // client cuid or profile slug
  crmBase:  "https://app.yourcrm.com",
};
```

No URL parameters are involved. (`?api=` may still override `crmBase` for local
testing only.)

## The three designs

| `template` value | Look |
|---|---|
| `classic` | Sky-blue + slate, clean and conventional. |
| `premium` | Slate + sky, rounded, airy "luxury" feel. |
| `teal` | Teal/forest clinical palette, bold and modern. |

The client switches between these in the CRM (**Profile → Template**); the change
appears on their site on the next load. Profiles saved before the picker existed
default to `classic`.

## Hosting per client

It's two static files — host anywhere (S3/R2 + CDN, Cloudflare Pages, Netlify,
Nginx, GitHub Pages). For each client:

1. Copy `index.html` + `config.js` to that client's hosting (their own domain).
2. Edit `config.js` with their `clientId` and your `crmBase`.

On platforms with build-time env substitution, generate `config.js` from
environment variables (e.g. `CLIENT_ID`, `CRM_BASE`) instead of editing by hand.

## CRM endpoints this relies on (already in this repo)

- `GET /api/public/profile?id=…` — open, CORS-enabled. Returns
  `{ id, template, profile }`.
- `POST /api/p/[clientId]/lead` — CORS-enabled (+ `OPTIONS`) for cross-origin
  form posts.

Template selection is stored inside the profile JSON (`profile.template`),
edited on the dashboard **Profile** page and validated by `profileSchema`.

## Production note

`cdn.tailwindcss.com` compiles styles in the browser — ideal for this zero-build
setup, but heavier than a prebuilt stylesheet and it prints a dev console
warning. To go leaner later, swap the CDN `<script>` for a compiled Tailwind CSS
file; the markup is unchanged (only stock palette classes are used).
