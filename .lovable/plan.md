

# Improve Website Branding and SEO

Three things to build: a branded social preview image, a sitemap, and a public landing page.

## 1. Generate a Branded OG Image

Use Lovable AI (image generation model) to create a professional 1200x630 social preview image featuring:
- "RO Navigator" branding with the wrench icon concept
- Tagline: "Track Your Hours. Get Paid Right."
- Automotive/mechanic theme with a clean, modern look
- The generated image will replace `public/og-image.png`

## 2. Create a Sitemap

Add a `public/sitemap.xml` file listing the public pages of the site. Since most pages are behind authentication, the sitemap will include:
- `https://ronavigator.com/` (home/landing)
- `https://ronavigator.com/auth` (sign in/sign up)

The `robots.txt` already references `https://ronavigator.com/sitemap.xml`, so this will just work once the file is created.

## 3. Build a Public Landing Page

Create a new `/landing` route (public, no auth required) that acts as a marketing page for visitors who aren't logged in. Then update the routing so unauthenticated visitors see the landing page at `/` instead of being redirected to `/auth`.

The landing page will include:
- **Hero section** -- headline, tagline, and a "Get Started" call-to-action button
- **Features section** -- 3-4 key benefits (track ROs, pay summaries, flag discrepancies, works offline)
- **How It Works** -- simple 3-step flow (Sign up, Log your ROs, Review your pay)
- **CTA footer** -- final sign-up prompt
- Clean, professional design matching existing brand colors

### Routing Change

Currently `/` redirects to `/auth` if not logged in. After this change:
- Unauthenticated users visiting `/` see the landing page
- Authenticated users visiting `/` see the app (as before)
- Landing page buttons link to `/auth`

## Files to Create/Change

| File | Change |
|------|--------|
| `public/og-image.png` | Replace with AI-generated branded image |
| `public/sitemap.xml` | New file with site URLs |
| `src/pages/Landing.tsx` | New public marketing/landing page |
| `src/App.tsx` | Add `/landing` route, update `/` to show landing page for unauthenticated users |
| `index.html` | Update meta description if needed |

