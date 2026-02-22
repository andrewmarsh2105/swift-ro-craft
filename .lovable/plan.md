

# Improve SEO / Social Share Preview for RO Navigator

## Problem

When someone searches for "RO Navigator" on Google or shares the link on social media, the result shows a generic description and no preview image (the OG image URL points to `https://ronavigator.com/og-image.png` which may not resolve since the app is hosted at `swift-ro-craft.lovable.app`).

## Changes

### 1. Fix OG Image URL (`index.html`)

The current `og:image` and `twitter:image` tags point to `https://ronavigator.com/og-image.png`, but the app is published at `https://swift-ro-craft.lovable.app`. Update these to use the correct published URL so the image actually loads:

```
og:image → https://swift-ro-craft.lovable.app/og-image.png
twitter:image → https://swift-ro-craft.lovable.app/og-image.png
```

Also add missing tags:
- `og:url` -- tells search engines the canonical page URL
- `twitter:title` and `twitter:description` -- ensures Twitter/X renders a proper card
- `og:site_name` -- shows "RO Navigator" as the site name in previews

### 2. Improve the Description (`index.html`)

Replace the generic description with something more specific and compelling:

**Current:** "Track your automotive repair orders, hours, and pay summaries. Free for techs."

**New:** "The free app built for auto techs to log repair orders, track paid hours by pay period, flag pay discrepancies, and make sure every hour counts -- even offline."

This will appear under the title in Google results and social cards.

### 3. Add Structured Data (`index.html`)

Add a JSON-LD `WebApplication` schema block so Google can show richer results (app type, category, price):

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "RO Navigator",
  "url": "https://swift-ro-craft.lovable.app",
  "description": "...",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
}
```

### 4. Add `og:image` dimensions (`index.html`)

Adding width/height meta tags helps platforms render the image correctly:

```html
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

## Summary of Changes

| File | Change |
|------|--------|
| `index.html` | Fix OG image URLs, improve description, add missing meta tags, add JSON-LD structured data |

No backend or component changes needed -- this is purely an `index.html` metadata update.

