# The Price of Conflict

An interactive visual guide to how U.S. retail gasoline prices move with crude markets, taxes, regions, and major supply disruptions. The experience is built for clarity and exploration: a **Story** mode walks readers through the narrative, and an **Explorer** dashboard lets them compare conflicts, regions, and scenarios on their own.

**Live site:** [price-of-conflict.vercel.app](https://price-of-conflict.vercel.app)

## What you will find

- **Story mode**  
  Scroll-based chapters from intro through regional differences, import mix, state-level taxes, and a text-based **forecast simulator**. Includes guided highlights on the main national price chart, insight callouts after major visuals, a breakdown of what goes into a gallon of gas, sparkline legends for each conflict period, and a fixed chapter rail (desktop) that tracks your place in the narrative.

- **Explorer mode**  
  A single-screen dashboard: national price timeline with selectable conflict bands, **compare two conflicts** side by side (timeline, regional charts, volatility bars, key metrics), PADD regional line charts, U.S. crude import donut by year, state filter and mobile-friendly state picker, and **CSV export** of the embedded monthly series.

- **Design**  
  Dark UI tuned for charts, Playfair Display for headlines and large figures, Libre Franklin for body and UI, and a red accent for cost and disruption cues.

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | [Next.js](https://nextjs.org) 16 (App Router), static export (`output: "export"`) |
| UI | React 19, inline styles in one client page |
| Charts | [D3.js](https://d3js.org) (timeline, flows, sparklines), [Chart.js](https://www.chartjs.org/) (regional lines, donut) |
| Utilities | lodash |

## Data

All series and tables are **embedded in the app** (no runtime API calls). Values are drawn from public sources such as EIA retail gasoline and import data, Tax Foundation state excise rates, and cited research; see the **Sources and methodology** section at the bottom of the live site for links and notes.

## Project layout

- `src/app/page.jsx` – main application (story + explorer, charts, data)
- `src/app/layout.tsx` – fonts (Google: Libre Franklin, Playfair Display), metadata, JSON-LD
- `src/app/globals.css` – base styles, scroll margins for in-page nav, print tweaks
- `public/` – static assets (e.g. Open Graph image)

## Scripts

```bash
npm install
npm run dev      # local dev at http://localhost:3000
npm run build    # static export to `out/`
npm run lint
```

## Deploy

Configured for static hosting (e.g. Vercel). The production build produces static HTML and assets under `out/` after `next build`.

## Author

Mukund Ummadisetti · 2026
