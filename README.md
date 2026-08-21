# SalesAi Quote Builder — Deployment Guide

A static, client-side React app. No server, no database, no paid APIs.
Verified locally: `npm install && npm run build` completes cleanly and produces a
~930KB `dist/` folder (5 files) — well under Cloudflare Pages Free's limits (25MB/file, 20,000 files/site).

---

## What I could and couldn't do from here

I don't have the ability to create a Cloudflare account, click through Cloudflare's
dashboard, connect a GitHub repo, or generate a live `pages.dev` URL — those all
require your own Cloudflare account and your own decisions (your domain, your
approved emails). So there is **no live URL yet**, and I haven't claimed one.
Everything below is the exact sequence of steps to get one, with the account-level
steps clearly marked **[YOU DO THIS]**.

There's also a Cloudflare connector available in this chat that can query your
Cloudflare account programmatically once you connect it (list accounts, manage
Workers/KV, etc.). It doesn't replace the dashboard steps below — Pages' Git
integration and Access's identity/policy setup are dashboard-driven — but if you
connect it, I can help verify things after each step. Let me know if you'd like
that option presented.

---

## 1. Push this code to a Git repository **[YOU DO THIS]**

Cloudflare Pages deploys from a Git repo (GitHub or GitLab).

1. Create a new empty repository (e.g. `salesai-quote-builder`) on GitHub.
2. From the folder containing this project:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-ORG/salesai-quote-builder.git
   git push -u origin main
   ```

If you'd rather not use Git at all, Cloudflare Pages also supports direct upload
via the `wrangler` CLI (`npx wrangler pages deploy dist`) after running
`npm run build` locally — this skips Git entirely but means you redeploy manually
each time instead of on every push.

---

## 2. Create the Cloudflare Pages project **[YOU DO THIS]**

1. Go to **dash.cloudflare.com** → log in or create a free account.
   - Creating the base Cloudflare account itself does **not** require a credit card.
2. In the sidebar: **Workers & Pages** → **Create application** → select the **Pages** tab → **Import an existing Git repository**.
3. Authorize Cloudflare's GitHub app, select the `salesai-quote-builder` repo, then **Begin setup**.
4. On the **Set up builds and deployments** screen, enter exactly:
   - **Production branch:** `main`
   - **Build command:** `npm run build`
   - **Build directory:** `dist`
   - **Project name** defaults to your repo name and becomes your `*.pages.dev` subdomain — change it here if you want a different subdomain.
5. Click **Save and Deploy**.

Cloudflare will install dependencies, run the build, and deploy. This first
deploy typically takes 1–2 minutes. When it finishes you'll get a URL like:

```
https://salesai-quote-builder.pages.dev
```

**This is your live URL once step 2 is complete on your end** — I can't generate
or verify it myself since it only exists inside your Cloudflare account.

Cloudflare Pages Free includes unlimited requests/bandwidth for static assets,
500 builds/month, and up to 20,000 files per site — this project uses 5 files
and will use a handful of builds per update, so it sits nowhere near any limit.

---

## 3. Restrict access with Cloudflare Access (Zero Trust) **[YOU DO THIS]**

⚠️ **Heads up before you start:** Cloudflare currently requires you to add a
credit card to your account to activate Zero Trust / Access, **even on the Free
plan**. You will not be charged as long as you stay under 50 seats and don't
enable paid add-ons — but Cloudflare does ask for the card up front. If you'd
rather not add one, this is the point to stop and decide; everything else in
this app (the builder itself) works fine without Access, it just means it isn't
access-restricted.

If you're OK adding a card for the free tier:

1. In the Cloudflare dashboard sidebar, go to **Zero Trust**.
2. If prompted, choose a team name (this becomes `<your-team-name>.cloudflareaccess.com`
   — only used for the login screen, not your app's URL).
3. Under **Plan**, confirm **Free (up to 50 users)** is selected — do not select
   a paid plan. Add the requested payment method when prompted; this is required
   to proceed but you will remain on $0/month at this usage level.
4. **Enable one-time-PIN login first** — as of Cloudflare's current setup flow,
   new Zero Trust accounts default to *only* Cloudflare's own identity
   provider, and OTP is no longer added automatically. Go to
   **Zero Trust → Integrations → Identity providers → Add new identity
   provider → One-time PIN**. This takes one click and needs no further
   config.
   - If your company already uses Google Workspace and you'd rather use
     "Sign in with Google" instead of/alongside OTP, that's the same screen —
     **Add new identity provider → Google** — but it needs your Google
     Workspace admin to register an OAuth client first. Tell me if you want
     to go this route and I'll walk through it.
5. Go to **Zero Trust → Access controls → Applications → Add an application → Self-hosted**.
6. Name the application (e.g. "SalesAi Quote Builder") and enter the
   **application domain**: your Pages URL, e.g. `salesai-quote-builder.pages.dev`.
7. **Session duration:** your choice (e.g. 24 hours) is fine for an internal tool.
8. Under **Policies**, create a policy, e.g. named "SalesAi Team":
   - **Action:** Allow
   - **Include** rule — choose one or both:
     - **Emails ending in** → enter your approved company domain
       (e.g. `@yourcompany.com`) — **I have not hard-coded any domain**; you
       supply it here.
     - **Emails** → add individually approved addresses one at a time.
9. Save the application.

From this point, anyone opening your `.pages.dev` URL is redirected to a
Cloudflare-hosted login page before the app ever loads — the app itself has
no login code, exactly as specified.

---

## 4. Redeploying after a pricing or content change

1. Edit `src/data/pricingData.js` (this is the single file that holds every
   plan, price, feature, and usage tier).
2. Commit and push:
   ```
   git add .
   git commit -m "Update pricing"
   git push
   ```
3. Cloudflare Pages automatically rebuilds and redeploys on every push to
   `main` — no dashboard steps needed. You'll see the new build appear under
   **Workers & Pages → salesai-quote-builder → Deployments** within a minute or two.

---

## 5. Feature-by-feature: what's device-local vs. what's shared

| Feature | Where it lives |
|---|---|
| Pricing, plans, calculations | Bundled into the static app (`pricingData.js`), same for everyone |
| "Save Locally" quotes | **Browser `localStorage` only** — not visible to teammates, not backed up, cleared if the user clears site data |
| "Copy Internal Link" | Encodes only plan/voice/SMS **selection IDs** in the URL query string — never prospect info, never a price. Every value is re-validated against the pricing table on load, so a tampered URL can't force an invalid price. |
| PDF / PNG export | Generated entirely in-browser (`html2canvas` + `jsPDF`), downloaded directly — no server round-trip |
| Who can open the app at all | Cloudflare Access, configured entirely in your Cloudflare account |

---

## 6. Expected monthly cost: **$0**

- **Cloudflare Pages Free** — $0, static hosting, no usage-based line items for
  a site this size.
- **Cloudflare Access Free** — $0 for up to 50 users (a card is on file per
  Cloudflare's current signup flow, but nothing bills at this scale).
- **No database, no server, no paid PDF/image API, no third-party SaaS.**

If your team ever exceeds 50 authenticated users, Cloudflare Access moves to a
paid per-seat plan — worth a calendar reminder if headcount is likely to grow
past that.

---

## Local development

```
npm install
npm run dev       # local dev server with hot reload
npm run build     # production build → dist/
npm run preview   # serve the production build locally to sanity-check it
```

## Testing checklist (please verify after your deploy — I can't click through
## your live URL myself)

- [ ] Live `.pages.dev` URL loads
- [ ] Opening it in a private/incognito window (not logged into Access) is blocked
- [ ] An approved email can complete the one-time-PIN login and reach the app
- [ ] Drag-and-drop, click-to-select, and keyboard selection all still work
- [ ] Totals match the acceptance-test combinations from earlier
- [ ] Save Locally → reopen in "My Saved Quotes" round-trips correctly
- [ ] Copy Internal Link → pasted in a new tab (while logged into Access) restores the same plan/voice/SMS
- [ ] Editing the URL's `plan=`/`voice=`/`sms=` values to nonsense falls back to defaults instead of erroring
- [ ] PDF and PNG downloads open and look like a clean customer quote, not a screenshot of the builder
- [ ] At 1440×900, no vertical scrollbar
