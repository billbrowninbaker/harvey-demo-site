# Harvey companies demo site

A clickable demo website Bill put together for two Baker City, Oregon companies:

- **Rock Creek Developments, LLC**: property management and holdings. It owns, manages, and leases the commercial spaces at the Tenth Street Office Complex, whose tenants include the DMV.
- **Bill Harvey Custom Builder, Inc.**: a residential general contractor for custom homes, remodels, and additions.

It's plain static HTML, CSS, and JS with no build step. Open `index.html` through any static server.

## What's in it

| Path | What it is |
|---|---|
| `index.html` | The site: Home, Leasing, Building, Our Work, About, and Contact. Pages switch by URL hash (`#leasing`, `#building`, …). |
| `house-builder/` | "Design Your Custom Home", an interactive configurator for the custom builder side. |
| `properties/` | Property listings for the leasing side: filterable list, map with a pin per property, a detail page per property, and an Admin mode that adds, edits and marks properties (saved in the browser for the demo). |
| `img/` | The hero landscape and three project photos. |

## Demo-only, on purpose

- A gold "Demo site" bar runs across the top of every page.
- **Forms send nothing.** Submitting shows a thank-you that says it's a demo, and no network requests are made.
- **Contact details are placeholders:** (541) 000-0000, example.com emails, and a blank CCB number.
- **The photos are AI-generated samples** and are labeled SAMPLE PHOTO. They aren't real Harvey projects.
- Leasing suites, property listings and house-builder pricing are sample numbers to swap for real ones. The house-builder price table (`SAMPLE_PRICE_PER_SQFT` and `SAMPLE_ADJUSTMENTS` at the top of its script) is made up and runs high: a fully loaded lodge comes out over $1M. Replace it with the Harveys' real numbers.
- The property listings are SAMPLE LISTINGS with no real addresses. Their Admin mode saves only in the viewer's browser; the real version needs the company's server and a sign-in.

Nothing on the studio landing page links here, so it doesn't show up in the games catalog.
