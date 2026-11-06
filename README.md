# Rock Creek Developments demo site

A clickable demo website for **Rock Creek Developments, LLC** (Baker City, Oregon): Bill and Lorrie
Harvey's property management and holding company. It owns, manages, and leases the commercial spaces
at the Tenth Street Office Complex, whose tenants include the DMV.

Plain static HTML, CSS and JS with no build step. Open `index.html` through any static server.

## What's in it

| Path | What it is |
|---|---|
| `index.html` | Home, Leasing, About and Contact. Pages switch by URL hash (`#leasing`, `#about`, …). |
| `properties/` | Property listings: filterable list, map with a pin per property, a detail page per property, and an Admin mode that adds, edits and marks properties (saved in the browser for the demo). |
| `img/` | The hero landscape and sample photos. |
| `design/` | The original design mockups. |

## Demo-only, on purpose

- A gold "Demo site" bar runs across the top of every page.
- **Forms send nothing.** Submitting shows a thank-you that says it's a demo.
- **Contact details are placeholders:** (541) 000-0000 and example.com emails.
- **Photos are AI-generated samples**, labeled SAMPLE PHOTO.
- Leasing suites and property listings are SAMPLE numbers and SAMPLE LISTINGS with no real addresses.
  Admin mode saves only in the viewer's browser; the real version needs the company's server and a sign-in.
