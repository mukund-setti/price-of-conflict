"use client";

import { useState, useEffect, useRef, useMemo, useCallback, useId } from "react";
import * as d3 from "d3";
import * as Chart from "chart.js";
import _ from "lodash";

// ── Register Chart.js ──
try {
  const toRegister = [
    Chart.LineController, Chart.BarController, Chart.DoughnutController,
    Chart.LineElement, Chart.BarElement, Chart.ArcElement, Chart.PointElement,
    Chart.CategoryScale, Chart.LinearScale,
    Chart.Tooltip, Chart.Legend, Chart.Filler, Chart.Title
  ].filter(Boolean);
  Chart.Chart.register(...toRegister);
} catch(e) { console.warn("Chart.js registration:", e); }

// ══════════════════════════════════════════════
// DATA: Real EIA monthly averages ($/gal, regular grade)
// Source: EIA Weekly Retail Gasoline Prices, national average
// ══════════════════════════════════════════════
const NATIONAL_MONTHLY = [
  // 1991
  { date: "1991-01", price: 1.14 }, { date: "1991-02", price: 1.06 }, { date: "1991-03", price: 1.02 },
  { date: "1991-04", price: 1.05 }, { date: "1991-05", price: 1.12 }, { date: "1991-06", price: 1.14 },
  { date: "1991-07", price: 1.10 }, { date: "1991-08", price: 1.13 }, { date: "1991-09", price: 1.14 },
  { date: "1991-10", price: 1.12 }, { date: "1991-11", price: 1.13 }, { date: "1991-12", price: 1.09 },
  // 1992-1993 (stable)
  { date: "1992-06", price: 1.17 }, { date: "1992-12", price: 1.07 },
  { date: "1993-06", price: 1.09 }, { date: "1993-12", price: 1.02 },
  // 1994-1997
  { date: "1994-06", price: 1.10 }, { date: "1994-12", price: 1.08 },
  { date: "1995-06", price: 1.18 }, { date: "1995-12", price: 1.07 },
  { date: "1996-06", price: 1.28 }, { date: "1996-12", price: 1.24 },
  { date: "1997-06", price: 1.22 }, { date: "1997-12", price: 1.08 },
  // 1998-1999 (Asian crisis low)
  { date: "1998-03", price: 0.99 }, { date: "1998-06", price: 1.04 },
  { date: "1998-09", price: 0.99 }, { date: "1998-12", price: 0.93 },
  { date: "1999-03", price: 0.96 }, { date: "1999-06", price: 1.12 },
  { date: "1999-09", price: 1.25 }, { date: "1999-12", price: 1.30 },
  // 2000-2001
  { date: "2000-03", price: 1.54 }, { date: "2000-06", price: 1.62 },
  { date: "2000-09", price: 1.58 }, { date: "2000-12", price: 1.49 },
  { date: "2001-01", price: 1.47 }, { date: "2001-03", price: 1.41 },
  { date: "2001-06", price: 1.64 }, { date: "2001-09", price: 1.53 },
  { date: "2001-10", price: 1.20 }, { date: "2001-12", price: 1.06 },
  // 2002
  { date: "2002-03", price: 1.28 }, { date: "2002-06", price: 1.39 },
  { date: "2002-09", price: 1.36 }, { date: "2002-12", price: 1.37 },
  // 2003 (Iraq invasion)
  { date: "2003-01", price: 1.50 }, { date: "2003-02", price: 1.62 },
  { date: "2003-03", price: 1.72 }, { date: "2003-04", price: 1.59 },
  { date: "2003-05", price: 1.51 }, { date: "2003-06", price: 1.50 },
  { date: "2003-09", price: 1.68 }, { date: "2003-12", price: 1.49 },
  // 2004
  { date: "2004-03", price: 1.76 }, { date: "2004-06", price: 2.04 },
  { date: "2004-09", price: 1.89 }, { date: "2004-12", price: 1.84 },
  // 2005 (Katrina)
  { date: "2005-03", price: 2.09 }, { date: "2005-06", price: 2.17 },
  { date: "2005-08", price: 2.61 }, { date: "2005-09", price: 2.93 },
  { date: "2005-10", price: 2.78 }, { date: "2005-12", price: 2.19 },
  // 2006-2007
  { date: "2006-03", price: 2.40 }, { date: "2006-06", price: 2.89 },
  { date: "2006-08", price: 2.96 }, { date: "2006-12", price: 2.31 },
  { date: "2007-03", price: 2.56 }, { date: "2007-05", price: 3.15 },
  { date: "2007-06", price: 3.06 }, { date: "2007-09", price: 2.80 },
  { date: "2007-11", price: 3.09 }, { date: "2007-12", price: 3.02 },
  // 2008 (peak + crash)
  { date: "2008-01", price: 3.05 }, { date: "2008-03", price: 3.26 },
  { date: "2008-05", price: 3.76 }, { date: "2008-06", price: 4.06 },
  { date: "2008-07", price: 4.09 }, { date: "2008-08", price: 3.78 },
  { date: "2008-09", price: 3.60 }, { date: "2008-10", price: 3.06 },
  { date: "2008-11", price: 2.15 }, { date: "2008-12", price: 1.69 },
  // 2009
  { date: "2009-01", price: 1.79 }, { date: "2009-03", price: 1.94 },
  { date: "2009-06", price: 2.63 }, { date: "2009-09", price: 2.56 },
  { date: "2009-12", price: 2.62 },
  // 2010
  { date: "2010-03", price: 2.78 }, { date: "2010-06", price: 2.74 },
  { date: "2010-09", price: 2.70 }, { date: "2010-12", price: 2.99 },
  // 2011 (Libya, Arab Spring)
  { date: "2011-01", price: 3.10 }, { date: "2011-02", price: 3.17 },
  { date: "2011-03", price: 3.56 }, { date: "2011-04", price: 3.81 },
  { date: "2011-05", price: 3.93 }, { date: "2011-06", price: 3.68 },
  { date: "2011-09", price: 3.61 }, { date: "2011-12", price: 3.28 },
  // 2012
  { date: "2012-03", price: 3.87 }, { date: "2012-04", price: 3.90 },
  { date: "2012-06", price: 3.49 }, { date: "2012-09", price: 3.85 },
  { date: "2012-12", price: 3.30 },
  // 2013-2014
  { date: "2013-03", price: 3.69 }, { date: "2013-06", price: 3.60 },
  { date: "2013-09", price: 3.52 }, { date: "2013-12", price: 3.26 },
  { date: "2014-03", price: 3.52 }, { date: "2014-06", price: 3.68 },
  { date: "2014-07", price: 3.59 }, { date: "2014-09", price: 3.39 },
  { date: "2014-12", price: 2.55 },
  // 2015-2016 (low oil)
  { date: "2015-01", price: 2.08 }, { date: "2015-06", price: 2.78 },
  { date: "2015-12", price: 2.01 },
  { date: "2016-02", price: 1.73 }, { date: "2016-06", price: 2.36 },
  { date: "2016-12", price: 2.25 },
  // 2017-2019
  { date: "2017-06", price: 2.33 }, { date: "2017-12", price: 2.44 },
  { date: "2018-06", price: 2.89 }, { date: "2018-10", price: 2.87 },
  { date: "2018-12", price: 2.36 },
  { date: "2019-04", price: 2.84 }, { date: "2019-06", price: 2.72 },
  { date: "2019-10", price: 2.64 }, { date: "2019-12", price: 2.58 },
  // 2020 (COVID crash)
  { date: "2020-01", price: 2.57 }, { date: "2020-03", price: 2.17 },
  { date: "2020-04", price: 1.77 }, { date: "2020-05", price: 1.87 },
  { date: "2020-06", price: 2.07 }, { date: "2020-09", price: 2.18 },
  { date: "2020-12", price: 2.19 },
  // 2021
  { date: "2021-01", price: 2.33 }, { date: "2021-03", price: 2.81 },
  { date: "2021-06", price: 3.07 }, { date: "2021-09", price: 3.18 },
  { date: "2021-11", price: 3.39 }, { date: "2021-12", price: 3.28 },
  // 2022 (Russia-Ukraine)
  { date: "2022-01", price: 3.32 }, { date: "2022-02", price: 3.52 },
  { date: "2022-03", price: 4.24 }, { date: "2022-04", price: 4.11 },
  { date: "2022-05", price: 4.44 }, { date: "2022-06", price: 4.93 },
  { date: "2022-07", price: 4.65 }, { date: "2022-08", price: 3.95 },
  { date: "2022-09", price: 3.72 }, { date: "2022-10", price: 3.80 },
  { date: "2022-11", price: 3.60 }, { date: "2022-12", price: 3.21 },
  // 2023
  { date: "2023-01", price: 3.27 }, { date: "2023-03", price: 3.43 },
  { date: "2023-06", price: 3.57 }, { date: "2023-09", price: 3.84 },
  { date: "2023-12", price: 3.07 },
  // 2024
  { date: "2024-01", price: 3.08 }, { date: "2024-04", price: 3.63 },
  { date: "2024-06", price: 3.50 }, { date: "2024-09", price: 3.26 },
  { date: "2024-12", price: 2.98 },
  // 2025
  { date: "2025-01", price: 3.05 }, { date: "2025-03", price: 3.18 },
  { date: "2025-06", price: 3.42 }, { date: "2025-09", price: 3.65 },
  { date: "2025-12", price: 3.81 },
  // 2026
  { date: "2026-01", price: 3.92 }, { date: "2026-02", price: 4.05 },
  { date: "2026-03", price: 4.18 },
];

// PADD Region prices (monthly, select points): offsets from national avg
const PADD_OFFSETS = {
  "East Coast (PADD 1)": 0.08,
  "Midwest (PADD 2)": -0.05,
  "Gulf Coast (PADD 3)": -0.12,
  "Rocky Mountain (PADD 4)": 0.03,
  "West Coast (PADD 5)": 0.38,
};

// Conflicts with oil-region impact
const CONFLICTS = [
  { id: "gulf-war", name: "Gulf War", start: "1990-08", end: "1991-04", color: "#ef4444", region: "Middle East", detail: "Iraq invades Kuwait on August 2, 1990. Crude oil spot prices surge from $17/barrel to $36/barrel in under three months, a 112% increase (Hamilton, 'Historical Oil Shocks,' NBER Working Paper 16790). The invasion removes 4.3 million barrels/day of Iraqi and Kuwaiti exports. Prices stabilize only after Operation Desert Storm succeeds in January 1991." },
  { id: "iraq-war", name: "Iraq War", start: "2003-03", end: "2003-05", color: "#f97316", region: "Middle East", detail: "The U.S. invades Iraq on March 20, 2003. Pre-war uncertainty drives gasoline to $1.72/gal, up 26% from the prior year (EIA). Prices dip briefly on swift military success, but the broader disruption to Iraqi output triggers a five-year price climb that peaks at $4.09/gal in 2008." },
  { id: "iraq-surge", name: "Iraq Surge", start: "2007-01", end: "2007-06", color: "#f97316", region: "Middle East", detail: "President Bush announces the troop surge in January 2007. Combined with surging demand from China's industrialization, crude begins its climb from $54/barrel to a record $145/barrel by mid-2008 (FRED, WTI Crude). This period marks the start of what analysts call the 2000s oil supercycle." },
  { id: "libya", name: "Libya / Arab Spring", start: "2011-02", end: "2011-10", color: "#eab308", region: "North Africa", detail: "NATO intervention in Libya removes approximately 1.6 million barrels/day from the market (IEA). U.S. gasoline prices jump from $3.10 to $3.93 in four months. Libyan output does not fully recover for years, contributing to structurally elevated prices through 2014." },
  { id: "isis", name: "ISIS Advance", start: "2014-06", end: "2014-12", color: "#a855f7", region: "Iraq/Syria", detail: "ISIS captures Mosul and threatens Iraqi oilfields in June 2014. Crude briefly spikes on supply fears, but global oversupply and surging U.S. shale production cause prices to collapse from $107 to below $55/barrel by year's end (EIA Short-Term Energy Outlook)." },
  { id: "iran-sanctions", name: "Iran Sanctions", start: "2018-05", end: "2018-11", color: "#ec4899", region: "Middle East", detail: "The U.S. exits the Iran nuclear deal (JCPOA) in May 2018 and re-imposes sanctions. Iranian exports fall by roughly 1.5 million barrels/day. Brent crude rises above $85/barrel before easing as waivers are granted to key importers in November." },
  { id: "russia-ukraine", name: "Russia-Ukraine War", start: "2022-02", end: "2022-09", color: "#3b82f6", region: "Eastern Europe", detail: "Russia's invasion of Ukraine disrupts 5M+ barrels/day of exports. U.S. gas reaches $4.93/gal, the highest level since July 2008 (EIA). Europe faces its worst energy crisis in decades." },
  { id: "iran-war", name: "Iran Conflict", start: "2025-06", end: "2026-03", color: "#dc2626", region: "Middle East", detail: "U.S.-Iran tensions escalate into direct military conflict in late February 2026. Iran closes the Strait of Hormuz, which carries roughly 20 million barrels/day, about 20% of global petroleum consumption (EIA). Brent crude surpasses $100/barrel on March 8, 2026 for the first time in four years. The IEA describes it as the 'greatest global energy security challenge in history' (IEA Oil Market Report, March 2026). The Federal Reserve Bank of Dallas estimates global GDP could fall 0.2 to 1.3 percentage points depending on duration." },
];

// Oil import sources (% of total US crude imports by country)
// Source: EIA Monthly Energy Review April 2025, Tables 3.3c/3.3d via AFDC
// and EIA U.S. Crude Oil Imports (pet_move_impcus)
const IMPORT_SOURCES_TIMELINE = {
  "1991": { "Saudi Arabia": 24, Venezuela: 14, Canada: 14, Mexico: 11, Iraq: 0, Other: 39 },
  "2003": { Canada: 17, "Saudi Arabia": 14, Mexico: 13, Venezuela: 11, Iraq: 4, Other: 40 },
  "2008": { Canada: 19, "Saudi Arabia": 12, Mexico: 10, Venezuela: 9, Iraq: 5, Russia: 4, Other: 41 },
  "2014": { Canada: 37, "Saudi Arabia": 13, Mexico: 9, Venezuela: 9, Iraq: 4, Other: 29 },
  "2022": { Canada: 60, Mexico: 10, "Saudi Arabia": 7, Iraq: 4, Colombia: 4, Brazil: 2, Other: 12 },
  "2024": { Canada: 62, Mexico: 7, "Saudi Arabia": 4, Venezuela: 3, Brazil: 3, Colombia: 3, Iraq: 3, Guyana: 3, Other: 11 },
};

const SOURCE_COLORS = {
  Canada: "#3b82f6",
  "Saudi Arabia": "#f59e0b",
  Mexico: "#ef4444",
  Venezuela: "#a78bfa",
  Iraq: "#fb923c",
  Colombia: "#2dd4bf",
  Brazil: "#818cf8",
  Russia: "#f87171",
  Guyana: "#34d399",
  Other: "#6b7280",
};

// ══════════════════════════════════════════════
// STATE DATA: PADD mapping, tax rates, price offsets
// Source: EIA PADD regions, Tax Foundation 2025, EIA state prices
// ══════════════════════════════════════════════
const STATE_DATA = {
  AL: { name: "Alabama", padd: 3, tax: 0.29, offset: -0.10, refinery: false },
  AK: { name: "Alaska", padd: 5, tax: 0.09, offset: 0.15, refinery: true },
  AZ: { name: "Arizona", padd: 5, tax: 0.18, offset: 0.12, refinery: false },
  AR: { name: "Arkansas", padd: 3, tax: 0.25, offset: -0.12, refinery: true },
  CA: { name: "California", padd: 5, tax: 0.71, offset: 0.72, refinery: true },
  CO: { name: "Colorado", padd: 4, tax: 0.22, offset: 0.02, refinery: true },
  CT: { name: "Connecticut", padd: 1, tax: 0.43, offset: 0.14, refinery: false },
  DE: { name: "Delaware", padd: 1, tax: 0.23, offset: 0.05, refinery: true },
  FL: { name: "Florida", padd: 1, tax: 0.37, offset: 0.06, refinery: false },
  GA: { name: "Georgia", padd: 1, tax: 0.33, offset: -0.04, refinery: false },
  HI: { name: "Hawaii", padd: 5, tax: 0.19, offset: 0.95, refinery: true },
  ID: { name: "Idaho", padd: 4, tax: 0.33, offset: 0.08, refinery: false },
  IL: { name: "Illinois", padd: 2, tax: 0.66, offset: 0.16, refinery: true },
  IN: { name: "Indiana", padd: 2, tax: 0.55, offset: 0.02, refinery: true },
  IA: { name: "Iowa", padd: 2, tax: 0.30, offset: -0.08, refinery: false },
  KS: { name: "Kansas", padd: 2, tax: 0.24, offset: -0.06, refinery: true },
  KY: { name: "Kentucky", padd: 2, tax: 0.26, offset: -0.05, refinery: true },
  LA: { name: "Louisiana", padd: 3, tax: 0.20, offset: -0.16, refinery: true },
  ME: { name: "Maine", padd: 1, tax: 0.30, offset: 0.10, refinery: false },
  MD: { name: "Maryland", padd: 1, tax: 0.47, offset: 0.09, refinery: false },
  MA: { name: "Massachusetts", padd: 1, tax: 0.27, offset: 0.10, refinery: false },
  MI: { name: "Michigan", padd: 2, tax: 0.48, offset: 0.04, refinery: true },
  MN: { name: "Minnesota", padd: 2, tax: 0.32, offset: -0.02, refinery: true },
  MS: { name: "Mississippi", padd: 3, tax: 0.18, offset: -0.14, refinery: true },
  MO: { name: "Missouri", padd: 2, tax: 0.30, offset: -0.10, refinery: false },
  MT: { name: "Montana", padd: 4, tax: 0.33, offset: 0.06, refinery: true },
  NE: { name: "Nebraska", padd: 2, tax: 0.30, offset: -0.04, refinery: false },
  NV: { name: "Nevada", padd: 5, tax: 0.24, offset: 0.18, refinery: false },
  NH: { name: "New Hampshire", padd: 1, tax: 0.22, offset: 0.06, refinery: false },
  NJ: { name: "New Jersey", padd: 1, tax: 0.42, offset: 0.06, refinery: true },
  NM: { name: "New Mexico", padd: 3, tax: 0.19, offset: -0.02, refinery: true },
  NY: { name: "New York", padd: 1, tax: 0.46, offset: 0.18, refinery: false },
  NC: { name: "North Carolina", padd: 1, tax: 0.40, offset: 0.02, refinery: false },
  ND: { name: "North Dakota", padd: 2, tax: 0.23, offset: -0.04, refinery: true },
  OH: { name: "Ohio", padd: 2, tax: 0.39, offset: 0.00, refinery: true },
  OK: { name: "Oklahoma", padd: 2, tax: 0.20, offset: -0.12, refinery: true },
  OR: { name: "Oregon", padd: 5, tax: 0.40, offset: 0.22, refinery: false },
  PA: { name: "Pennsylvania", padd: 1, tax: 0.58, offset: 0.14, refinery: true },
  RI: { name: "Rhode Island", padd: 1, tax: 0.37, offset: 0.10, refinery: false },
  SC: { name: "South Carolina", padd: 1, tax: 0.28, offset: -0.06, refinery: false },
  SD: { name: "South Dakota", padd: 2, tax: 0.30, offset: -0.02, refinery: false },
  TN: { name: "Tennessee", padd: 2, tax: 0.27, offset: -0.06, refinery: true },
  TX: { name: "Texas", padd: 3, tax: 0.20, offset: -0.14, refinery: true },
  UT: { name: "Utah", padd: 4, tax: 0.37, offset: 0.06, refinery: true },
  VT: { name: "Vermont", padd: 1, tax: 0.33, offset: 0.12, refinery: false },
  VA: { name: "Virginia", padd: 1, tax: 0.30, offset: 0.02, refinery: false },
  WA: { name: "Washington", padd: 5, tax: 0.59, offset: 0.35, refinery: true },
  WV: { name: "West Virginia", padd: 1, tax: 0.36, offset: 0.02, refinery: false },
  WI: { name: "Wisconsin", padd: 2, tax: 0.33, offset: -0.02, refinery: false },
  WY: { name: "Wyoming", padd: 4, tax: 0.24, offset: 0.00, refinery: true },
  DC: { name: "District of Columbia", padd: 1, tax: 0.29, offset: 0.14, refinery: false },
};

const PADD_NAMES = {
  1: "East Coast (PADD 1)",
  2: "Midwest (PADD 2)",
  3: "Gulf Coast (PADD 3)",
  4: "Rocky Mountain (PADD 4)",
  5: "West Coast (PADD 5)",
};

const PADD_DETAILS = {
  1: { desc: "Relies heavily on pipeline deliveries from the Gulf Coast and imports through East Coast ports. With minimal domestic crude production, prices here are especially sensitive to transport costs and import disruptions (EIA Regional Price Differences).", vulnScore: 3 },
  2: { desc: "Connected to Canadian crude via pipeline and has significant refining capacity. Relatively insulated from maritime disruptions but exposed to Canadian supply policy.", vulnScore: 2 },
  3: { desc: "Home to more than half of U.S. refinery capacity. Proximity to domestic production and Gulf port infrastructure keeps prices here the lowest in the country (EIA Petroleum Supply Annual).", vulnScore: 1 },
  4: { desc: "Small, isolated market with limited pipeline connections. Local refineries process Wyoming and Montana crude. Prices can spike when local refineries shut down for maintenance.", vulnScore: 3 },
  5: { desc: "Geographically isolated with strict fuel formulations (especially California). Limited pipeline access to Gulf Coast supply. Highest structural prices in the country.", vulnScore: 5 },
};

const EIA_BASELINE_FORECAST = [
  { date: "2026-01", price: 3.12 },
  { date: "2026-02", price: 3.28 },
  { date: "2026-03", price: 3.58 },
  { date: "2026-04", price: 3.65 },
  { date: "2026-05", price: 3.72 },
  { date: "2026-06", price: 3.68 },
  { date: "2026-07", price: 3.55 },
  { date: "2026-08", price: 3.42 },
  { date: "2026-09", price: 3.25 },
  { date: "2026-10", price: 3.10 },
  { date: "2026-11", price: 3.02 },
  { date: "2026-12", price: 2.95 },
  { date: "2027-01", price: 2.85 },
  { date: "2027-02", price: 2.88 },
  { date: "2027-03", price: 2.95 },
  { date: "2027-04", price: 3.02 },
  { date: "2027-05", price: 3.05 },
  { date: "2027-06", price: 3.07 },
  { date: "2027-07", price: 3.05 },
  { date: "2027-08", price: 3.00 },
  { date: "2027-09", price: 2.92 },
  { date: "2027-10", price: 2.85 },
  { date: "2027-11", price: 2.78 },
  { date: "2027-12", price: 2.78 },
  { date: "2028-01", price: 2.75 },
  { date: "2028-02", price: 2.78 },
  { date: "2028-03", price: 2.85 },
  { date: "2028-04", price: 2.92 },
  { date: "2028-05", price: 2.95 },
  { date: "2028-06", price: 2.97 },
  { date: "2028-07", price: 2.95 },
  { date: "2028-08", price: 2.90 },
  { date: "2028-09", price: 2.82 },
  { date: "2028-10", price: 2.78 },
  { date: "2028-11", price: 2.72 },
  { date: "2028-12", price: 2.70 },
  { date: "2029-01", price: 2.68 },
  { date: "2029-02", price: 2.70 },
  { date: "2029-03", price: 2.78 },
  { date: "2029-04", price: 2.85 },
  { date: "2029-05", price: 2.88 },
  { date: "2029-06", price: 2.90 },
  { date: "2029-07", price: 2.88 },
  { date: "2029-08", price: 2.85 },
  { date: "2029-09", price: 2.78 },
  { date: "2029-10", price: 2.72 },
  { date: "2029-11", price: 2.68 },
  { date: "2029-12", price: 2.65 },
];

const DISRUPTION_PROFILES = [
  {
    id: "chokepoint-closure",
    category: "Chokepoint Closure",
    description: "Major maritime chokepoint blocked or restricted (Strait of Hormuz, Suez Canal)",
    keywords: ["hormuz", "strait", "chokepoint", "blockade", "naval", "shipping lane", "suez"],
    historicalExamples: [
      { name: "Iran/Hormuz Crisis 2026", peakIncrease: 0.47, monthsToPeak: 1, recovery: "ongoing" },
      { name: "Suez Canal Blockage 2021", peakIncrease: 0.03, monthsToPeak: 0.5, recovery: "1 month" },
    ],
    peakMultiplier: 0.45,
    monthsToPeak: 2,
    plateauMonths: 3,
    recoveryMonths: 8,
    supplyDisruptionMbd: 5.0,
    regionalMultipliers: { "PADD 1": 1.1, "PADD 2": 0.95, "PADD 3": 0.85, "PADD 4": 0.90, "PADD 5": 1.30 },
    confidenceBand: 0.18,
  },
  {
    id: "major-producer-invasion",
    category: "Major Producer Invaded",
    description: "Military invasion of or by a top-10 oil producing nation",
    keywords: ["invasion", "invade", "occupy", "annex", "troops", "military operation"],
    historicalExamples: [
      { name: "Iraq invades Kuwait 1990", peakIncrease: 0.47, monthsToPeak: 3, recovery: "6 months" },
      { name: "Russia invades Ukraine 2022", peakIncrease: 0.40, monthsToPeak: 4, recovery: "8 months" },
      { name: "Iraq War 2003", peakIncrease: 0.12, monthsToPeak: 1, recovery: "2 months" },
    ],
    peakMultiplier: 0.38,
    monthsToPeak: 3,
    plateauMonths: 4,
    recoveryMonths: 8,
    supplyDisruptionMbd: 3.5,
    regionalMultipliers: { "PADD 1": 1.05, "PADD 2": 0.95, "PADD 3": 0.85, "PADD 4": 0.92, "PADD 5": 1.25 },
    confidenceBand: 0.15,
  },
  {
    id: "civil-war-producer",
    category: "Civil War in Producer State",
    description: "Internal conflict or revolution disrupting a major oil producer",
    keywords: ["civil war", "revolution", "uprising", "overthrow", "coup", "rebel", "unrest"],
    historicalExamples: [
      { name: "Libyan Civil War 2011", peakIncrease: 0.27, monthsToPeak: 5, recovery: "10 months" },
      { name: "Iranian Revolution 1979", peakIncrease: 1.14, monthsToPeak: 12, recovery: "36 months" },
      { name: "Venezuelan Crisis 2017-19", peakIncrease: 0.08, monthsToPeak: 6, recovery: "12 months" },
    ],
    peakMultiplier: 0.28,
    monthsToPeak: 4,
    plateauMonths: 5,
    recoveryMonths: 10,
    supplyDisruptionMbd: 1.5,
    regionalMultipliers: { "PADD 1": 1.05, "PADD 2": 0.97, "PADD 3": 0.88, "PADD 4": 0.93, "PADD 5": 1.22 },
    confidenceBand: 0.20,
  },
  {
    id: "sanctions-major-producer",
    category: "Sanctions on Major Producer",
    description: "Economic sanctions restricting oil exports from a major producer",
    keywords: ["sanctions", "embargo", "ban", "restrict exports", "trade war", "tariff oil"],
    historicalExamples: [
      { name: "Iran Sanctions 2018", peakIncrease: 0.11, monthsToPeak: 4, recovery: "3 months" },
      { name: "Russia Sanctions 2022", peakIncrease: 0.15, monthsToPeak: 3, recovery: "6 months" },
      { name: "OPEC Embargo 1973", peakIncrease: 0.70, monthsToPeak: 5, recovery: "18 months" },
    ],
    peakMultiplier: 0.18,
    monthsToPeak: 3,
    plateauMonths: 4,
    recoveryMonths: 6,
    supplyDisruptionMbd: 1.0,
    regionalMultipliers: { "PADD 1": 1.02, "PADD 2": 0.98, "PADD 3": 0.90, "PADD 4": 0.95, "PADD 5": 1.18 },
    confidenceBand: 0.14,
  },
  {
    id: "opec-production-cut",
    category: "OPEC Production Cut",
    description: "Coordinated OPEC or OPEC+ supply reduction",
    keywords: ["opec", "production cut", "output cut", "supply cut", "cartel", "quota"],
    historicalExamples: [
      { name: "OPEC+ Cut 2023", peakIncrease: 0.18, monthsToPeak: 3, recovery: "5 months" },
      { name: "OPEC Cut 2016-17", peakIncrease: 0.22, monthsToPeak: 6, recovery: "8 months" },
    ],
    peakMultiplier: 0.20,
    monthsToPeak: 4,
    plateauMonths: 5,
    recoveryMonths: 7,
    supplyDisruptionMbd: 1.5,
    regionalMultipliers: { "PADD 1": 1.02, "PADD 2": 0.97, "PADD 3": 0.88, "PADD 4": 0.95, "PADD 5": 1.20 },
    confidenceBand: 0.12,
  },
  {
    id: "global-recession",
    category: "Global Recession / Demand Collapse",
    description: "Major economic downturn or pandemic causing demand destruction",
    keywords: ["recession", "depression", "pandemic", "covid", "lockdown", "crash", "financial crisis", "demand collapse"],
    historicalExamples: [
      { name: "COVID-19 2020", peakIncrease: -0.32, monthsToPeak: 2, recovery: "14 months" },
      { name: "Global Financial Crisis 2008", peakIncrease: -0.45, monthsToPeak: 5, recovery: "18 months" },
    ],
    peakMultiplier: -0.30,
    monthsToPeak: 3,
    plateauMonths: 4,
    recoveryMonths: 14,
    supplyDisruptionMbd: 0,
    regionalMultipliers: { "PADD 1": 1.0, "PADD 2": 1.0, "PADD 3": 0.95, "PADD 4": 1.0, "PADD 5": 1.05 },
    confidenceBand: 0.22,
  },
  {
    id: "natural-disaster",
    category: "Major Natural Disaster",
    description: "Hurricane, earthquake, or climate event disrupting refining/transport",
    keywords: ["hurricane", "earthquake", "flood", "disaster", "storm", "category 5", "refinery damage", "pipeline damage"],
    historicalExamples: [
      { name: "Hurricane Katrina 2005", peakIncrease: 0.40, monthsToPeak: 1, recovery: "3 months" },
      { name: "Hurricane Harvey 2017", peakIncrease: 0.12, monthsToPeak: 0.5, recovery: "2 months" },
    ],
    peakMultiplier: 0.22,
    monthsToPeak: 1,
    plateauMonths: 1,
    recoveryMonths: 3,
    supplyDisruptionMbd: 0.5,
    regionalMultipliers: { "PADD 1": 1.05, "PADD 2": 0.95, "PADD 3": 1.30, "PADD 4": 0.90, "PADD 5": 1.10 },
    confidenceBand: 0.16,
  },
  {
    id: "world-war",
    category: "Multi-Theater Global Conflict",
    description: "Large-scale conflict involving multiple major powers and oil regions",
    keywords: ["world war", "ww3", "wwiii", "global war", "nuclear", "nato war", "great power war", "multi-front", "world war 3"],
    historicalExamples: [
      { name: "No modern precedent. Estimated from compounding worst-case scenarios.", peakIncrease: null, monthsToPeak: null, recovery: null },
    ],
    peakMultiplier: 0.85,
    monthsToPeak: 2,
    plateauMonths: 12,
    recoveryMonths: 24,
    supplyDisruptionMbd: 15.0,
    regionalMultipliers: { "PADD 1": 1.15, "PADD 2": 1.0, "PADD 3": 0.90, "PADD 4": 0.95, "PADD 5": 1.35 },
    confidenceBand: 0.35,
  },
  {
    id: "terror-attack",
    category: "Major Terror Attack",
    description: "Large-scale terror event causing demand shock and market uncertainty",
    keywords: ["terror", "terrorist", "attack", "bombing", "9/11", "strike on"],
    historicalExamples: [
      { name: "September 11 2001", peakIncrease: -0.11, monthsToPeak: 1, recovery: "2 months" },
    ],
    peakMultiplier: -0.08,
    monthsToPeak: 1,
    plateauMonths: 1,
    recoveryMonths: 3,
    supplyDisruptionMbd: 0,
    regionalMultipliers: { "PADD 1": 1.1, "PADD 2": 1.0, "PADD 3": 0.95, "PADD 4": 1.0, "PADD 5": 1.05 },
    confidenceBand: 0.12,
  },
  {
    id: "energy-transition",
    category: "Accelerated Energy Transition",
    description: "Rapid policy shift toward renewables reducing oil demand over time",
    keywords: ["ev mandate", "electric vehicle", "renewable", "green new deal", "carbon tax", "ban gasoline", "phase out oil", "energy transition"],
    historicalExamples: [
      { name: "No single historical precedent. Gradual effect modeled from IEA Net Zero scenarios.", peakIncrease: null, monthsToPeak: null, recovery: null },
    ],
    peakMultiplier: -0.15,
    monthsToPeak: 12,
    plateauMonths: 24,
    recoveryMonths: 0,
    supplyDisruptionMbd: 0,
    regionalMultipliers: { "PADD 1": 1.0, "PADD 2": 1.0, "PADD 3": 0.95, "PADD 4": 1.0, "PADD 5": 1.10 },
    confidenceBand: 0.25,
  },
];

const SEVERITY_MODIFIERS = {
  amplifiers: {
    keywords: ["massive", "total", "complete", "all-out", "full-scale", "catastrophic", "worst case", "escalat", "nuclear"],
    multiplier: 1.35,
  },
  dampeners: {
    keywords: ["minor", "small", "limited", "brief", "short", "partial", "localized", "temporary"],
    multiplier: 0.6,
  },
  durationExtenders: {
    keywords: ["prolonged", "years", "decade", "permanent", "indefinite", "long-term", "sustained", "chronic"],
    recoveryMultiplier: 2.0,
  },
};

// ══════════════════════════════════════════════
// THEME / STYLES
// ══════════════════════════════════════════════
const FONT = "'Libre Franklin', 'Helvetica Neue', sans-serif";
const DISPLAY_FONT = "'Playfair Display', Georgia, serif";
const BG = "#0a0a0a";
const BG_CARD = "#141414";
const BG_CARD_HOVER = "#1a1a1a";
const ACCENT = "#e63946";
const ACCENT_WARM = "#f4845f";
const TEXT = "#e8e6e3";
const TEXT_DIM = "#8a8882";
const TEXT_BRIGHT = "#ffffff";
const GRID = "#1e1e1e";
const BORDER = "#252525";

/** Story mode: section ids for scroll spy + sidebar (order = scroll order) */
const STORY_CHAPTERS = [
  { id: "story-hero", label: "Intro" },
  { id: "story-stats", label: "At a glance" },
  { id: "story-drivers", label: "What drives prices" },
  { id: "story-ch1", label: "35 years of prices", sub: "Ch. 01" },
  { id: "story-chain", label: "The price chain" },
  { id: "story-cost", label: "Household cost" },
  { id: "story-ch2", label: "Prices by region", sub: "Ch. 02" },
  { id: "story-ch3", label: "Where oil comes from", sub: "Ch. 03" },
  { id: "story-ch4", label: "Your state", sub: "Ch. 04" },
  { id: "story-factors", label: "Five factors" },
  { id: "story-forecast", label: "What if?", sub: "Ch. 05" },
  { id: "story-explore", label: "Open explorer" },
  { id: "story-about", label: "About" },
  { id: "story-sources", label: "Sources" },
];

// ══════════════════════════════════════════════
// UTILITY
// ══════════════════════════════════════════════
const parseDate = (d) => {
  const [y, m] = d.split("-");
  return new Date(parseInt(y), parseInt(m) - 1);
};

const fmtPrice = (p) => `$${p.toFixed(2)}`;
const fmtDate = (d) => {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const [y, m] = d.split("-");
  return `${months[parseInt(m)-1]} ${y}`;
};

const FORECAST_ANCHOR_YM = { year: 2026, month: 3 };

function ymKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function compareYM(a, b) {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

function addMonthsYM(y, m, delta) {
  const d = new Date(y, m - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function enumerateMonthKeys(start, end) {
  const out = [];
  let y = start.year;
  let mo = start.month;
  while (compareYM({ year: y, month: mo }, end) <= 0) {
    out.push(ymKey(y, mo));
    mo++;
    if (mo > 12) {
      mo = 1;
      y++;
    }
  }
  return out;
}

function classifyScenario(inputText) {
  const lower = inputText.toLowerCase();
  let best = null;
  let bestCount = 0;
  let bestMatched = [];
  for (const profile of DISRUPTION_PROFILES) {
    const matched = [];
    for (const kw of profile.keywords) {
      if (lower.includes(kw)) matched.push(kw);
    }
    const c = matched.length;
    if (c > bestCount) {
      bestCount = c;
      best = profile;
      bestMatched = matched;
    }
  }
  if (!best || bestCount === 0) return null;
  let severityMultiplier = 1.0;
  let recoveryMultiplier = 1.0;
  const ampHit = SEVERITY_MODIFIERS.amplifiers.keywords.some(k => lower.includes(k));
  const dampHit = SEVERITY_MODIFIERS.dampeners.keywords.some(k => lower.includes(k));
  if (ampHit && dampHit) severityMultiplier = 1.0;
  else if (ampHit) severityMultiplier = SEVERITY_MODIFIERS.amplifiers.multiplier;
  else if (dampHit) severityMultiplier = SEVERITY_MODIFIERS.dampeners.multiplier;
  if (SEVERITY_MODIFIERS.durationExtenders.keywords.some(k => lower.includes(k))) {
    recoveryMultiplier = SEVERITY_MODIFIERS.durationExtenders.recoveryMultiplier;
  }
  const confidence = Math.min(1, bestMatched.length / Math.max(1, best.keywords.length));
  return {
    profile: best,
    confidence,
    severityMultiplier,
    recoveryMultiplier,
    matchedKeywords: bestMatched,
  };
}

function parseEventDate(inputText) {
  const lower = inputText.toLowerCase();
  const nowY = 2026;
  if (/\bnext year\b/.test(lower)) return { year: nowY + 1, month: 1 };
  let sm = lower.match(/\bsummer\s+(\d{4})\b/);
  if (sm) {
    const y = parseInt(sm[1], 10);
    if (!Number.isNaN(y)) return { year: y, month: 6 };
  }
  sm = lower.match(/\bwinter\s+(\d{4})\b/);
  if (sm) {
    const y = parseInt(sm[1], 10);
    if (!Number.isNaN(y)) return { year: y, month: 12 };
  }
  const monthNames = {
    january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5,
    june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9,
    october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
  };
  for (const name of Object.keys(monthNames)) {
    const re = new RegExp(`\\b${name}\\s+(\\d{4})\\b`, "i");
    if (re.test(lower)) {
      const y = parseInt(RegExp.$1, 10);
      if (!Number.isNaN(y)) return { year: y, month: monthNames[name] };
    }
  }
  const inYear = lower.match(/\bin\s+(\d{4})\b/);
  if (inYear) {
    const y = parseInt(inYear[1], 10);
    if (!Number.isNaN(y)) return { year: y, month: 1 };
  }
  const y4 = lower.match(/\b(20\d{2})\b/);
  if (y4) {
    const y = parseInt(y4[1], 10);
    if (!Number.isNaN(y) && y >= 2020 && y <= 2099) return { year: y, month: 1 };
  }
  return { year: 2027, month: 1 };
}

function isEventBeforeAnchor(eventDate) {
  return compareYM(eventDate, FORECAST_ANCHOR_YM) < 0;
}

function ymFromKeyParts(key) {
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m };
}

function buildEiaBaselineMap() {
  const map = {};
  for (const row of EIA_BASELINE_FORECAST) map[row.date] = row.price;
  return map;
}

function extrapolateBaselinePrice(targetKey, eiaByDate) {
  if (eiaByDate[targetKey] != null) return eiaByDate[targetKey];
  const monthDeltas = [];
  for (let mo = 1; mo <= 12; mo++) {
    const curK = ymKey(2029, mo);
    const prevK = mo === 1 ? ymKey(2028, 12) : ymKey(2029, mo - 1);
    monthDeltas.push(eiaByDate[curK] - eiaByDate[prevK]);
  }
  let cy = 2029;
  let cm = 12;
  let p = eiaByDate["2029-12"];
  const targetParts = targetKey.split("-").map(Number);
  const targetYM = { year: targetParts[0], month: targetParts[1] };
  while (compareYM({ year: cy, month: cm }, targetYM) < 0) {
    cm++;
    if (cm > 12) {
      cm = 1;
      cy++;
    }
    p += monthDeltas[cm - 1];
  }
  return p;
}

function easeInOutHermite(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function generateForecast(classification, eventDate, stateCode, options = {}) {
  const eiaByDate = buildEiaBaselineMap();
  const profile = classification.profile;
  const sm = classification.severityMultiplier;
  const rm = classification.recoveryMultiplier;
  const bandScale = options.farFutureBand ? 2.0 : 1.0;
  const baseConfidence = profile.confidenceBand * bandScale;

  const windowEnd = addMonthsYM(eventDate.year, eventDate.month, 36);
  const monthKeys = enumerateMonthKeys(FORECAST_ANCHOR_YM, windowEnd);
  const eventKey = ymKey(eventDate.year, eventDate.month);
  let eventIdx = monthKeys.findIndex(k => k >= eventKey);
  if (eventIdx < 0) eventIdx = monthKeys.length - 1;

  const baseline = monthKeys.map((k) => {
    let p = eiaByDate[k];
    if (p == null) p = extrapolateBaselinePrice(k, eiaByDate);
    return { date: k, price: p };
  });

  const mPeak = Math.max(0.25, profile.monthsToPeak);
  const plat = profile.plateauMonths;
  const totalRecovery = profile.recoveryMonths <= 0 ? 0 : profile.recoveryMonths * rm;

  const rawScenario = baseline.map((row, i) => {
    const monthsFromEvent = i - eventIdx;
    let impact = 0;
    if (monthsFromEvent >= 0) {
      if (monthsFromEvent <= mPeak) {
        const t = monthsFromEvent / mPeak;
        impact = profile.peakMultiplier * sm * easeInOutHermite(t);
      } else if (monthsFromEvent <= mPeak + plat) {
        impact = profile.peakMultiplier * sm;
      } else {
        const monthsIntoRecovery = monthsFromEvent - mPeak - plat;
        if (totalRecovery <= 0) {
          impact = 0;
        } else {
          const decayFactor = Math.max(0, 1 - monthsIntoRecovery / totalRecovery);
          impact = profile.peakMultiplier * sm * decayFactor * decayFactor;
        }
      }
    }
    let scenarioPrice = row.price * (1 + impact);
    return { date: row.date, price: scenarioPrice, baselinePrice: row.price, monthsFromEvent: i - eventIdx };
  });

  const st = stateCode ? STATE_DATA[stateCode] : null;
  const paddKey = st ? `PADD ${st.padd}` : null;
  const regionalMult = paddKey && profile.regionalMultipliers[paddKey] != null
    ? profile.regionalMultipliers[paddKey]
    : 1;
  const taxAdj = st ? st.tax - 0.368 : 0;

  const scenario = rawScenario.map((row) => {
    const b = row.baselinePrice;
    let sp = b + (row.price - b) * regionalMult;
    sp += taxAdj;
    const bp = b + taxAdj;
    return { date: row.date, price: sp, baselinePrice: bp, monthsFromEvent: row.monthsFromEvent };
  });

  const upper = [];
  const lower = [];
  for (let i = 0; i < scenario.length; i++) {
    const row = scenario[i];
    const mfe = Math.max(0, row.monthsFromEvent);
    const widen = 1 + mfe * 0.02;
    const half = baseConfidence * 0.5 * widen;
    upper.push({ date: row.date, price: row.price * (1 + half) });
    lower.push({ date: row.date, price: row.price * (1 - half) });
  }

  let peakPrice = -Infinity;
  let peakDate = monthKeys[0];
  let peakIdxFound = 0;
  scenario.forEach((row, i) => {
    if (row.price > peakPrice) {
      peakPrice = row.price;
      peakDate = row.date;
      peakIdxFound = i;
    }
  });

  let estimatedRecoveryDate = monthKeys[monthKeys.length - 1];
  for (let i = peakIdxFound + 1; i < scenario.length; i++) {
    const row = scenario[i];
    const b = row.baselinePrice;
    if (b <= 0) continue;
    if (Math.abs(row.price - b) / b <= 0.05) {
      estimatedRecoveryDate = row.date;
      break;
    }
  }

  const postEventDiffs = scenario
    .filter((row) => row.monthsFromEvent >= 0)
    .map((row) => row.price - row.baselinePrice);
  const avgDiff = postEventDiffs.length ? _.mean(postEventDiffs) : 0;
  const extraHouseholdCost = avgDiff * 72 * 12;

  const peakIdx = scenario.findIndex(r => r.date === peakDate);
  const monthsToPeakModel = peakIdx >= 0 && peakIdx >= eventIdx ? peakIdx - eventIdx : Math.round(mPeak);

  return {
    baseline: scenario.map(r => ({ date: r.date, price: r.baselinePrice })),
    scenario: scenario.map(r => ({ date: r.date, price: r.price })),
    upper,
    lower,
    peakPrice,
    peakDate,
    estimatedRecoveryDate,
    extraHouseholdCost,
    profile,
    monthsToPeakDisplay: monthsToPeakModel,
    eventDateKey: eventKey,
    locationLabel: st ? st.name : "National Average",
  };
}

// ══════════════════════════════════════════════
// RESPONSIVE HOOK
// ══════════════════════════════════════════════
function useIsMobile(breakpoint = 680) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

// ══════════════════════════════════════════════
// CHART ANNOTATIONS: key narrative moments
// ══════════════════════════════════════════════
const ANNOTATIONS = [
  { date: "1990-10", label: "Iraq invades Kuwait", anchor: "top", color: "#ef4444" },
  { date: "2003-03", label: "U.S. invades Iraq", anchor: "top", color: "#f97316" },
  { date: "2005-09", label: "Hurricane Katrina", anchor: "top", color: "#8b5cf6" },
  { date: "2008-07", label: "$4.09 / all-time high", anchor: "top", color: "#dc2626" },
  { date: "2008-12", label: "Financial crisis crash", anchor: "bottom", color: "#3b82f6" },
  { date: "2011-05", label: "Libya intervention", anchor: "top", color: "#eab308" },
  { date: "2020-04", label: "COVID collapse", anchor: "bottom", color: "#6b7280" },
  { date: "2022-06", label: "$4.93 / Ukraine war peak", anchor: "top", color: "#3b82f6" },
  { date: "2026-03", label: "Hormuz crisis", anchor: "top", color: "#dc2626" },
];

// ══════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════

// ── Animated counter ──
function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 2 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    let frame;
    const start = display;
    const diff = value - start;
    const duration = 600;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + diff * eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span>{prefix}{display.toFixed(decimals)}{suffix}</span>;
}

// ── Scroll-triggered fade-in ──
function FadeIn({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// ── Scroll-triggered count-up (for big hero numbers) ──
function CountUp({ target, prefix = "", suffix = "", duration = 2000 }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) { setStarted(true); obs.disconnect(); } }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [started]);
  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    const animate = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setVal(target * eased);
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [started, target, duration]);
  return <span ref={ref}>{prefix}{typeof target === "number" && target % 1 !== 0 ? val.toFixed(2) : Math.round(val).toLocaleString()}{suffix}</span>;
}

// ── Animated gas pump price sign ──
function GasPumpSign({ price }) {
  const [flicker, setFlicker] = useState(false);
  useEffect(() => {
    const id = setInterval(() => { setFlicker(f => !f); }, 150);
    const id2 = setTimeout(() => clearInterval(id), 1200);
    return () => { clearInterval(id); clearTimeout(id2); };
  }, [price]);
  return (
    <div style={{
      display: "inline-flex", flexDirection: "column", alignItems: "center",
      background: "#1a1a1a", borderRadius: 16, padding: "20px 32px",
      border: `2px solid ${ACCENT}40`, boxShadow: `0 0 30px ${ACCENT}15, inset 0 0 20px ${ACCENT}08`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ fontSize: 10, color: TEXT_DIM, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Regular</div>
      <div style={{
        fontFamily: "'Courier New', monospace", fontSize: 52, fontWeight: 900, letterSpacing: 2,
        color: flicker ? `${ACCENT}90` : ACCENT,
        textShadow: `0 0 20px ${ACCENT}60, 0 0 40px ${ACCENT}30`,
        transition: "color 0.1s",
      }}>
        {price.toFixed(2)}
      </div>
      <div style={{ fontSize: 10, color: TEXT_DIM, letterSpacing: 1 }}>per gallon</div>
      {/* Scanline effect */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
      }} />
    </div>
  );
}

// ── Household Cost Ticker: visceral dollar impact ──
function HouseholdCostTicker() {
  const mobile = useIsMobile();
  // Average US household uses ~1,200 gal/year
  // Extra cost = price spike × gallons during conflict period
  const data = [
    { conflict: "Gulf War", year: "'90-91", extra: 380, color: "#ef4444" },
    { conflict: "Iraq War", year: "'03-08", extra: 4200, color: "#f97316" },
    { conflict: "Libya", year: "'11", extra: 840, color: "#eab308" },
    { conflict: "Russia-Ukraine", year: "'22", extra: 1920, color: "#3b82f6" },
    { conflict: "Iran Conflict", year: "'25-26", extra: 1450, color: "#dc2626" },
  ];
  const total = data.reduce((s, d) => s + d.extra, 0);
  const maxExtra = Math.max(...data.map(d => d.extra));

  return (
    <div style={{ background: BG_CARD, borderRadius: 20, padding: 28, border: `1px solid ${BORDER}` }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 11, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>
          Estimated extra household gas spending during major supply disruptions since 1990
        </div>
        <div style={{
          fontFamily: DISPLAY_FONT, fontSize: "clamp(48px, 6vw, 72px)", fontWeight: 900,
          color: ACCENT,
          textShadow: `0 0 40px ${ACCENT}30`,
        }}>
          $<CountUp target={total} duration={2500} />
        </div>
        <div style={{ fontSize: 14, color: TEXT_DIM, marginTop: 4 }}>
          and counting
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {data.map((d, i) => (
          <div key={d.conflict} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: mobile ? 80 : 130, textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_BRIGHT }}>{d.conflict}</div>
              <div style={{ fontSize: 11, color: TEXT_DIM }}>{d.year}</div>
            </div>
            <div style={{ flex: 1, height: 32, background: GRID, borderRadius: 6, overflow: "hidden", position: "relative" }}>
              <div style={{
                height: "100%", borderRadius: 6,
                background: `linear-gradient(90deg, ${d.color}cc, ${d.color})`,
                width: `${(d.extra / maxExtra) * 100}%`,
                transition: "width 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
                transitionDelay: `${i * 0.15}s`,
                display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 12,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
                  ${d.extra.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 24, padding: "14px 20px", borderRadius: 12,
        background: `${ACCENT}08`, border: `1px solid ${ACCENT}20`,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ fontSize: 24 }}>💡</div>
        <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.5 }}>
          That's <span style={{ color: ACCENT, fontWeight: 700 }}>${total.toLocaleString()}</span> extra per household. That is enough to cover
          {" "}<span style={{ color: TEXT_BRIGHT, fontWeight: 600 }}>{Math.round(total / 150)} months</span> of groceries
          or <span style={{ color: TEXT_BRIGHT, fontWeight: 600 }}>{Math.round(total / 50)} tanks</span> of gas at pre-conflict prices.
        </div>
      </div>
    </div>
  );
}

// ── Animated conflict timeline with scrubber ──
function ConflictScrubber({ onConflictHover }) {
  const [hoveredId, setHoveredId] = useState(null);
  const containerRef = useRef(null);

  const timelineStart = 1990;
  const timelineEnd = 2026;
  const totalYears = timelineEnd - timelineStart;

  const getPosition = (dateStr) => {
    const [y, m] = dateStr.split("-").map(Number);
    return ((y + (m - 1) / 12) - timelineStart) / totalYears * 100;
  };

  return (
    <div ref={containerRef} style={{ position: "relative", padding: "20px 0 60px" }}>
      {/* Year markers */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        {[1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025].map(y => (
          <div key={y} style={{ fontSize: 10, color: TEXT_DIM, fontFamily: FONT }}>
            {y}
          </div>
        ))}
      </div>

      {/* Track */}
      <div style={{
        position: "relative", height: 6, background: GRID, borderRadius: 3,
        marginBottom: 16,
      }}>
        {/* Conflict segments on track */}
        {CONFLICTS.map(c => {
          const left = getPosition(c.start);
          const right = getPosition(c.end);
          const isHovered = hoveredId === c.id;
          return (
            <div
              key={c.id}
              onMouseEnter={() => { setHoveredId(c.id); onConflictHover?.(c); }}
              onMouseLeave={() => { setHoveredId(null); onConflictHover?.(null); }}
              style={{
                position: "absolute", top: isHovered ? -4 : 0,
                left: `${left}%`, width: `${right - left}%`,
                height: isHovered ? 14 : 6, borderRadius: 3,
                background: c.color, cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: isHovered ? `0 0 16px ${c.color}60` : "none",
                zIndex: isHovered ? 10 : 1,
              }}
            />
          );
        })}
      </div>

      {/* Conflict labels with price impact */}
      <div style={{ position: "relative", height: 80 }}>
        {CONFLICTS.map((c, i) => {
          const left = getPosition(c.start);
          const right = getPosition(c.end);
          const center = (left + right) / 2;
          const isHovered = hoveredId === c.id;

          // Get price during conflict
          const duringPrices = NATIONAL_MONTHLY.filter(d => d.date >= c.start && d.date <= c.end);
          const peakPrice = duringPrices.length ? Math.max(...duringPrices.map(d => d.price)) : 0;

          return (
            <div
              key={c.id}
              style={{
                position: "absolute", left: `${center}%`, transform: "translateX(-50%)",
                textAlign: "center", transition: "all 0.3s ease",
                opacity: hoveredId === null || isHovered ? 1 : 0.3,
              }}
            >
              <div style={{
                width: 2, height: 12, background: c.color, margin: "0 auto 6px",
                opacity: 0.5,
              }} />
              <div style={{
                fontSize: isHovered ? 13 : 10, fontWeight: isHovered ? 700 : 500,
                color: isHovered ? c.color : TEXT_DIM,
                transition: "all 0.2s", whiteSpace: "nowrap",
              }}>
                {c.name}
              </div>
              {isHovered && peakPrice > 0 && (
                <div style={{
                  fontSize: 18, fontWeight: 800, color: TEXT_BRIGHT,
                  fontFamily: DISPLAY_FONT, marginTop: 2,
                }}>
                  ${peakPrice.toFixed(2)}
                  <span style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 400, fontFamily: FONT }}> peak</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Oil Flow Sankey-style visual ──
function OilFlowDiagram({ year }) {
  const svgRef = useRef(null);
  const sources = IMPORT_SOURCES_TIMELINE[year] || IMPORT_SOURCES_TIMELINE["2025"];
  const entries = Object.entries(sources).filter(([k]) => k !== "Other").sort((a, b) => b[1] - a[1]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const w = 700, h = 320;
    svg.attr("viewBox", `0 0 ${w} ${h}`);

    const leftX = 120, rightX = 580, midX = 350;
    const nodeH = 28;
    const totalPct = entries.reduce((s, [, v]) => s + v, 0);
    const startY = 30;
    const gap = 6;

    // Source nodes (left)
    let yOff = startY;
    const sourcePositions = entries.map(([name, pct]) => {
      const height = Math.max(nodeH, (pct / totalPct) * (h - 80));
      const pos = { name, pct, y: yOff, height, midY: yOff + height / 2 };
      yOff += height + gap;
      return pos;
    });

    // Destination (right): single "U.S." node
    const usY = startY;
    const usH = yOff - startY - gap;

    // Draw flows
    const flows = svg.append("g");
    let rightYOff = usY;

    sourcePositions.forEach((src, i) => {
      const rightH = (src.pct / totalPct) * usH;
      const color = SOURCE_COLORS[src.name] || "#6b7280";

      const path = d3.path();
      path.moveTo(leftX + 80, src.y);
      path.bezierCurveTo(midX, src.y, midX, rightYOff, rightX - 80, rightYOff);
      path.lineTo(rightX - 80, rightYOff + rightH);
      path.bezierCurveTo(midX, rightYOff + rightH, midX, src.y + src.height, leftX + 80, src.y + src.height);
      path.closePath();

      flows.append("path")
        .attr("d", path.toString())
        .attr("fill", color)
        .attr("opacity", 0)
        .transition()
        .delay(i * 120)
        .duration(600)
        .attr("opacity", 0.35);

      // Source label
      svg.append("text")
        .attr("x", leftX + 74)
        .attr("y", src.midY + 1)
        .attr("text-anchor", "end")
        .attr("fill", TEXT)
        .attr("font-size", "12px")
        .attr("font-family", FONT)
        .attr("font-weight", 500)
        .text(src.name)
        .attr("opacity", 0)
        .transition().delay(i * 120 + 200).duration(400).attr("opacity", 1);

      // Percentage
      svg.append("text")
        .attr("x", leftX + 74)
        .attr("y", src.midY + 14)
        .attr("text-anchor", "end")
        .attr("fill", color)
        .attr("font-size", "11px")
        .attr("font-family", FONT)
        .attr("font-weight", 700)
        .text(`${src.pct}%`)
        .attr("opacity", 0)
        .transition().delay(i * 120 + 300).duration(400).attr("opacity", 1);

      rightYOff += rightH;
    });

    // US destination label
    svg.append("text")
      .attr("x", rightX - 70)
      .attr("y", usY + usH / 2 - 8)
      .attr("text-anchor", "start")
      .attr("fill", TEXT_BRIGHT)
      .attr("font-size", "16px")
      .attr("font-family", FONT)
      .attr("font-weight", 700)
      .text("U.S.")
      .attr("opacity", 0)
      .transition().delay(800).duration(500).attr("opacity", 1);

    svg.append("text")
      .attr("x", rightX - 70)
      .attr("y", usY + usH / 2 + 10)
      .attr("text-anchor", "start")
      .attr("fill", TEXT_DIM)
      .attr("font-size", "11px")
      .attr("font-family", FONT)
      .text("Refineries")
      .attr("opacity", 0)
      .transition().delay(900).duration(500).attr("opacity", 1);

    // Year label
    svg.append("text")
      .attr("x", w / 2).attr("y", h - 8)
      .attr("text-anchor", "middle")
      .attr("fill", TEXT_DIM).attr("font-size", "11px").attr("font-family", FONT)
      .text(`Crude oil import share, ${year}`);

  }, [year]);

  return (
    <div style={{ width: "100%" }}>
      <svg ref={svgRef} style={{ width: "100%", height: "auto" }} />
    </div>
  );
}

// ── Pocket Impact visual: animated dollar bills ──
function PocketImpact({ stateCode, conflict }) {
  const mobile = useIsMobile();
  const st = STATE_DATA[stateCode];
  if (!st) return null;
  const c = conflict || CONFLICTS[CONFLICTS.length - 1];

  const duringPrices = NATIONAL_MONTHLY.filter(d => d.date >= c.start && d.date <= c.end).map(d => d.price);
  const preDate = parseDate(c.start);
  preDate.setMonth(preDate.getMonth() - 6);
  const preStr = `${preDate.getFullYear()}-${String(preDate.getMonth()+1).padStart(2,"0")}`;
  const prePrices = NATIONAL_MONTHLY.filter(d => d.date >= preStr && d.date < c.start).map(d => d.price);

  const preAvg = (prePrices.length ? _.mean(prePrices) : 3.0) + st.offset;
  const peakPrice = (duringPrices.length ? _.max(duringPrices) : 3.5) + st.offset;
  const extraPerGallon = peakPrice - preAvg;
  const extraPerFillup = extraPerGallon * 15; // 15 gal tank
  const extraPerMonth = extraPerGallon * 100;
  const extraPerYear = extraPerGallon * 1200;

  const billCount = Math.min(Math.round(extraPerMonth / 10), 15);

  return (
    <div style={{
      background: `linear-gradient(135deg, ${BG_CARD}, #18120e)`,
      borderRadius: 20, padding: 28, border: `1px solid ${ACCENT}20`,
      position: "relative", overflow: "hidden",
    }}>
      {/* Background pulse */}
      <div style={{
        position: "absolute", bottom: -60, right: -60, width: 200, height: 200,
        background: `radial-gradient(circle, ${ACCENT}08, transparent 60%)`,
        borderRadius: "50%", animation: "pulse 3s ease-in-out infinite",
      }} />
      <style>{`@keyframes pulse { 0%,100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 1; } }`}</style>

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 11, color: ACCENT, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
          Estimated Impact: {st.name}
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr", gap: 16, marginBottom: 24,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              Extra per gallon
            </div>
            <div style={{
              fontSize: 36, fontWeight: 900, fontFamily: DISPLAY_FONT,
              color: ACCENT, lineHeight: 1,
            }}>
              +<CountUp target={extraPerGallon} prefix="$" duration={1500} />
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              Extra per fill-up
            </div>
            <div style={{
              fontSize: 36, fontWeight: 900, fontFamily: DISPLAY_FONT,
              color: ACCENT_WARM, lineHeight: 1,
            }}>
              +<CountUp target={extraPerFillup} prefix="$" duration={1800} />
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              Extra per year
            </div>
            <div style={{
              fontSize: 36, fontWeight: 900, fontFamily: DISPLAY_FONT,
              color: "#ef4444", lineHeight: 1,
            }}>
              +$<CountUp target={Math.round(extraPerYear)} duration={2200} />
            </div>
          </div>
        </div>

        {/* Animated dollar bills row */}
        <div style={{
          display: "flex", gap: 4, justifyContent: "center",
          padding: "16px 0", overflow: "hidden",
        }}>
          {Array.from({ length: billCount }, (_, i) => (
            <div
              key={i}
              style={{
                width: 44, height: 22, borderRadius: 3,
                background: `linear-gradient(135deg, #2d5016, #1a3a0a)`,
                border: "1px solid #3d6b20",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: "#5a9a2a",
                animation: `flyUp 0.5s ease-out ${i * 0.08}s both`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              $
            </div>
          ))}
        </div>
        <style>{`@keyframes flyUp { from { opacity: 0; transform: translateY(20px) rotate(-5deg); } to { opacity: 1; transform: translateY(0) rotate(0deg); } }`}</style>

        <div style={{
          textAlign: "center", fontSize: 13, color: TEXT_DIM, marginTop: 8, lineHeight: 1.6,
        }}>
          At peak prices during the <span style={{ color: ACCENT, fontWeight: 600 }}>{c.name}</span>,
          a {st.name} driver paying <span style={{ color: TEXT_BRIGHT, fontWeight: 600 }}>${preAvg.toFixed(2)}/gal</span> would
          see their price jump to <span style={{ color: ACCENT, fontWeight: 700 }}>${peakPrice.toFixed(2)}/gal</span>.
          That's <span style={{ color: TEXT_BRIGHT, fontWeight: 600 }}>${Math.round(extraPerYear).toLocaleString()} extra per year</span> going
          straight from your wallet to the geopolitical risk premium.
        </div>
      </div>
    </div>
  );
}

function ScenarioInput({ onSubmit, mobile }) {
  const [inputText, setInputText] = useState("");
  const [foc, setFoc] = useState(false);
  const presets = [
    { label: "Hormuz closure", text: "Iran closes the Strait of Hormuz for 6 months starting January 2027" },
    { label: "Major producer invasion", text: "Military invasion of a major oil-producing country in 2027" },
    { label: "OPEC production cut", text: "OPEC announces 3 million barrel per day production cut in mid 2027" },
    { label: "Global recession", text: "Global recession and demand collapse starting Q1 2028" },
    { label: "Severe hurricane season", text: "Category 5 hurricane destroys Gulf Coast refineries in August 2027" },
    { label: "World war", text: "Large-scale multi-theater conflict between major powers starting 2027" },
  ];
  const runPreset = (text) => {
    setInputText(text);
    onSubmit(text);
  };
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", width: "100%" }}>
      <h2 style={{
        fontFamily: DISPLAY_FONT, fontSize: mobile ? 22 : 28, fontWeight: 700, color: TEXT_BRIGHT,
        margin: "0 0 8px 0", lineHeight: 1.2,
      }}>
        What happens next?
      </h2>
      <p style={{ fontSize: 14, color: TEXT_DIM, lineHeight: 1.6, margin: "0 0 20px 0" }}>
        Describe a hypothetical event and see how gas prices might respond,
        based on patterns from 35 years of historical data.
      </p>
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onFocus={() => setFoc(true)}
        onBlur={() => setFoc(false)}
        placeholder={"e.g. 'Major war in the Middle East starting June 2027' or 'OPEC cuts production by 3 million barrels in 2028'"}
        rows={2}
        style={{
          width: "100%", boxSizing: "border-box", resize: "none",
          background: BG_CARD, borderWidth: 1, borderStyle: "solid",
          borderColor: foc ? ACCENT : BORDER, borderRadius: 12, padding: 16,
          color: TEXT_BRIGHT, fontSize: 15, fontFamily: FONT, outline: "none",
          transition: "border-color 0.2s",
        }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => runPreset(p.text)}
            style={{
              padding: "6px 14px", borderRadius: 8, borderWidth: 1, borderStyle: "solid", borderColor: BORDER,
              background: "transparent", color: TEXT_DIM, fontSize: 11, fontWeight: 600, cursor: "pointer",
              fontFamily: FONT, transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.target.style.color = TEXT_BRIGHT; e.target.style.borderColor = TEXT_DIM; }}
            onMouseLeave={(e) => { e.target.style.color = TEXT_DIM; e.target.style.borderColor = BORDER; }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          disabled={inputText.length <= 5}
          onClick={() => onSubmit(inputText)}
          style={{
            padding: "10px 28px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, fontFamily: FONT,
            cursor: inputText.length > 5 ? "pointer" : "not-allowed",
            opacity: inputText.length > 5 ? 1 : 0.45,
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_WARM})`,
            color: "#fff", transition: "all 0.2s",
          }}
        >
          Run Scenario
        </button>
      </div>
    </div>
  );
}

function ForecastResults({ forecast, classification, mobile }) {
  const [methOpen, setMethOpen] = useState(false);
  if (!forecast || !classification) return null;
  const prof = forecast.profile;
  const pos = prof.peakMultiplier >= 0;
  const examples = prof.historicalExamples.slice(0, 3);
  const nEx = prof.historicalExamples.length;
  const peakPct = (prof.peakMultiplier * 100).toFixed(0);
  return (
    <div style={{ maxWidth: 800, margin: "24px auto 0", width: "100%" }}>
      <div style={{
        fontSize: 11, color: TEXT_DIM, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1,
      }}>
        Location: <span style={{ color: TEXT_BRIGHT, fontWeight: 600 }}>{forecast.locationLabel}</span>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, 1fr)",
        gap: 12, marginBottom: 24,
      }}>
        {[
          { label: "Predicted Peak", val: `$${forecast.peakPrice.toFixed(2)}/gal`, col: pos ? ACCENT : "#34d399" },
          { label: "Time to Peak", val: `${forecast.monthsToPeakDisplay} months`, col: TEXT_BRIGHT },
          { label: "Est. Recovery", val: fmtDate(forecast.estimatedRecoveryDate), col: TEXT_BRIGHT },
          {
            label: "Extra Annual Cost",
            val: `${forecast.extraHouseholdCost >= 0 ? "+" : "-"}$${Math.round(Math.abs(forecast.extraHouseholdCost)).toLocaleString()}`,
            col: ACCENT,
          },
        ].map((m) => (
          <div
            key={m.label}
            style={{
              background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16,
            }}
          >
            <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: 24, fontFamily: DISPLAY_FONT, fontWeight: 700, color: m.col, lineHeight: 1.15 }}>
              {m.val}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
        This scenario most closely resembles:
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)",
        gap: 12, marginBottom: 20,
      }}>
        {examples.map((ex) => (
          <div
            key={ex.name}
            style={{
              background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_BRIGHT, marginBottom: 8 }}>{ex.name}</div>
            <div style={{ fontSize: 13, color: ex.peakIncrease != null ? ACCENT : TEXT_DIM, marginBottom: 4 }}>
              {ex.peakIncrease != null
                ? `Peak increase: +${(ex.peakIncrease * 100).toFixed(0)}%`
                : "Peak increase: see profile"}
            </div>
            <div style={{ fontSize: 12, color: TEXT_DIM, marginBottom: 2 }}>
              {ex.monthsToPeak != null ? `Time to peak: ${ex.monthsToPeak} months` : "Time to peak: varies"}
            </div>
            <div style={{ fontSize: 12, color: TEXT_DIM }}>
              Recovery: {ex.recovery != null ? ex.recovery : "n/a"}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setMethOpen(!methOpen)}
        style={{
          width: "100%", textAlign: "left", padding: "12px 16px", borderRadius: 12,
          background: BG_CARD, border: `1px solid ${BORDER}`, color: TEXT_BRIGHT, fontSize: 13, fontWeight: 600,
          fontFamily: FONT, cursor: "pointer", transition: "all 0.2s", marginBottom: methOpen ? 12 : 0,
        }}
      >
        How this forecast was generated {methOpen ? "▼" : "▶"}
      </button>
      {methOpen && (
        <div style={{
          background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16,
          fontSize: 13, color: TEXT_DIM, lineHeight: 1.65,
        }}>
          This is not a machine learning prediction. It is a scenario simulation based on
          pattern-matching against documented historical price responses to similar events.
          The engine identified your scenario as a {prof.category} event, matched it against
          {" "}{nEx} historical precedents from 1990-2026, and generated a price trajectory using
          the weighted-average disruption profile (peak multiplier: {prof.peakMultiplier >= 0 ? "+" : ""}{peakPct}%, time to peak: {prof.monthsToPeak} months,
          recovery: {prof.recoveryMonths} months). The confidence band reflects the variance across historical
          comparables. Regional adjustments are based on PADD district pricing differentials.
          Baseline prices are from the EIA Short-Term Energy Outlook (March 2026 release).
          Academic sources: Hamilton (NBER), Kilian and Zhou (Dallas Fed), Caldara and Iacoviello (Fed GPR Index).
        </div>
      )}
    </div>
  );
}

function ForecastChart({ forecast, mobile }) {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const uid = useId().replace(/:/g, "");
  const [resizeT, setResizeT] = useState(0);

  useEffect(() => {
    const fn = () => setResizeT((t) => t + 1);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !forecast) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const containerWidth = svgRef.current.parentElement?.clientWidth || 800;
    const width = containerWidth;
    const height = mobile ? 280 : 360;
    const margin = mobile
      ? { top: 20, right: 16, bottom: 36, left: 44 }
      : { top: 24, right: 24, bottom: 40, left: 52 };

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const hist = NATIONAL_MONTHLY
      .filter((d) => d.date >= "2020-01" && d.date <= "2026-03")
      .map((d) => ({ ...d, dateObj: parseDate(d.date) }));

    const basePts = forecast.baseline.map((d) => ({ ...d, dateObj: parseDate(d.date) }));
    const scenPts = forecast.scenario.map((d) => ({ ...d, dateObj: parseDate(d.date) }));
    const upperPts = forecast.upper.map((d) => ({ ...d, dateObj: parseDate(d.date) }));
    const lowerPts = forecast.lower.map((d) => ({ ...d, dateObj: parseDate(d.date) }));

    const tToday = parseDate("2026-03");
    const tEvent = parseDate(forecast.eventDateKey);
    const tStart = new Date(2020, 0, 1);
    const tEnd = scenPts.length ? scenPts[scenPts.length - 1].dateObj : tToday;

    const x = d3.scaleTime().domain([tStart, tEnd]).range([margin.left, width - margin.right]);

    const yMax = Math.max(
      d3.max(upperPts, (d) => d.price) || 0,
      d3.max(hist, (d) => d.price) || 0,
      4
    ) * 1.1;
    const y = d3.scaleLinear().domain([0, yMax]).range([height - margin.bottom, margin.top]);

    const bandObjects = scenPts.map((_, i) => ({
      dateObj: scenPts[i].dateObj,
      y0: lowerPts[i].price,
      y1: upperPts[i].price,
    }));

    const bandArea = d3
      .area()
      .x((d) => x(d.dateObj))
      .y0((d) => y(d.y0))
      .y1((d) => y(d.y1))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(bandObjects)
      .attr("fill", ACCENT)
      .attr("fill-opacity", 0.08)
      .attr("d", bandArea);

    y.ticks(5).forEach((tick) => {
      svg.append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", y(tick))
        .attr("y2", y(tick))
        .attr("stroke", BORDER)
        .attr("stroke-opacity", 0.3);
    });

    const lineH = d3.line()
      .x((d) => x(d.dateObj))
      .y((d) => y(d.price))
      .curve(d3.curveMonotoneX);
    svg.append("path")
      .datum(hist)
      .attr("fill", "none")
      .attr("stroke", TEXT_DIM)
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", 1.5)
      .attr("d", lineH);

    const xToday = x(tToday);
    svg.append("line")
      .attr("x1", xToday)
      .attr("x2", xToday)
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .attr("stroke", TEXT_DIM)
      .attr("stroke-opacity", 0.4)
      .attr("stroke-dasharray", "4,4");
    svg.append("text")
      .attr("x", xToday)
      .attr("y", margin.top - 4)
      .attr("text-anchor", "middle")
      .attr("fill", TEXT_DIM)
      .attr("font-size", "10px")
      .attr("font-family", FONT)
      .text("Today");

    const lineB = d3.line()
      .x((d) => x(d.dateObj))
      .y((d) => y(d.price))
      .curve(d3.curveMonotoneX);
    svg.append("path")
      .datum(basePts)
      .attr("fill", "none")
      .attr("stroke", TEXT_DIM)
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "5,5")
      .attr("d", lineB);

    const xEv = x(tEvent);
    svg.append("line")
      .attr("x1", xEv)
      .attr("x2", xEv)
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .attr("stroke", ACCENT)
      .attr("stroke-opacity", 0.6)
      .attr("stroke-dasharray", "4,3");
    svg.append("text")
      .attr("x", xEv)
      .attr("y", margin.top + 14)
      .attr("text-anchor", "middle")
      .attr("fill", ACCENT)
      .attr("font-size", "10px")
      .attr("font-family", FONT)
      .text(forecast.profile.category);

    const lineS = d3.line()
      .x((d) => x(d.dateObj))
      .y((d) => y(d.price))
      .curve(d3.curveMonotoneX);
    const pathS = svg.append("path")
      .datum(scenPts)
      .attr("fill", "none")
      .attr("stroke", ACCENT)
      .attr("stroke-width", 2.5)
      .attr("d", lineS);
    const totalLen = pathS.node().getTotalLength();
    pathS.attr("stroke-dasharray", totalLen)
      .attr("stroke-dashoffset", totalLen)
      .transition()
      .duration(1600)
      .ease(d3.easeCubicOut)
      .attr("stroke-dashoffset", 0);

    const pk = scenPts.find((p) => p.date === forecast.peakDate) || scenPts[scenPts.length - 1];
    svg.append("circle")
      .attr("cx", x(pk.dateObj))
      .attr("cy", y(pk.price))
      .attr("r", 5)
      .attr("fill", ACCENT);
    svg.append("text")
      .attr("x", x(pk.dateObj) + 8)
      .attr("y", y(pk.price) + 4)
      .attr("fill", ACCENT)
      .attr("font-size", "12px")
      .attr("font-weight", 700)
      .attr("font-family", FONT)
      .text(`${forecast.peakPrice.toFixed(2)}/gal`);

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(mobile ? 5 : 6).tickFormat(d3.timeFormat("%Y")))
      .call((g) => g.select(".domain").attr("stroke", BORDER))
      .call((g) => g.selectAll(".tick line").attr("stroke", BORDER))
      .call((g) => g.selectAll(".tick text").attr("fill", TEXT_DIM).attr("font-size", mobile ? "9px" : "11px").attr("font-family", FONT));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat((d) => `$${d.toFixed(2)}`))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick line").remove())
      .call((g) => g.selectAll(".tick text").attr("fill", TEXT_DIM).attr("font-size", mobile ? "9px" : "11px").attr("font-family", FONT));

    svg.append("text")
      .attr("x", 4)
      .attr("y", margin.top + 10)
      .attr("fill", TEXT_DIM)
      .attr("font-size", "11px")
      .attr("font-family", FONT)
      .text("$/gal");

    const cross = svg.append("line")
      .attr("class", `fc-cross-${uid}`)
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .attr("stroke", TEXT_DIM)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "2,2")
      .attr("stroke-opacity", 0.5)
      .style("display", "none");

    svg.append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom)
      .attr("fill", "transparent")
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const dt = x.invert(mx);
        const bisect = d3.bisector((d) => d.dateObj).left;
        const i = bisect(scenPts, dt, 1);
        const d0 = scenPts[i - 1];
        const d1 = scenPts[i];
        if (!d0 || !d1) return;
        const d = dt - d0.dateObj > d1.dateObj - dt ? d1 : d0;
        const idx = scenPts.findIndex((p) => p.date === d.date);
        const baseP = idx >= 0 ? forecast.baseline[idx]?.price : null;
        const scenP = d.price;
        const delta = baseP != null ? scenP - baseP : 0;
        cross.attr("x1", x(d.dateObj)).attr("x2", x(d.dateObj)).style("display", null);
        if (tooltipRef.current) {
          tooltipRef.current.style.display = "block";
          tooltipRef.current.style.left = `${x(d.dateObj)}px`;
          tooltipRef.current.style.top = `${y(scenP)}px`;
          const sign = delta >= 0 ? "+" : "";
          const col = delta >= 0 ? ACCENT : "#34d399";
          const bline = baseP != null ? `$${baseP.toFixed(2)}` : "n/a";
          tooltipRef.current.innerHTML = `
            <div style="font-size:11px;color:${TEXT_DIM};font-family:${FONT}">${fmtDate(d.date)}</div>
            <div style="font-size:12px;color:${TEXT_BRIGHT};font-family:${FONT}">Baseline ${bline}</div>
            <div style="font-size:13px;font-weight:700;color:${ACCENT};font-family:${FONT}">Scenario $${scenP.toFixed(2)}</div>
            <div style="font-size:11px;color:${col};font-family:${FONT}">${sign}$${Math.abs(delta).toFixed(2)} from baseline</div>
          `;
        }
      })
      .on("mouseleave", () => {
        cross.style("display", "none");
        if (tooltipRef.current) tooltipRef.current.style.display = "none";
      });

    return () => {
      svg.selectAll("*").remove();
    };
  }, [forecast, mobile, resizeT, uid]);

  if (!forecast) return null;
  return (
    <div style={{ position: "relative", width: "100%", marginTop: 20 }}>
      <svg ref={svgRef} style={{ width: "100%", height: "auto", display: "block" }} />
      <div
        ref={tooltipRef}
        style={{
          display: "none", position: "absolute", pointerEvents: "none",
          background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8,
          padding: "8px 12px", transform: "translate(-50%, -110%)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}
      />
    </div>
  );
}

function PriceChart({ highlightConflict = null, showAllConflicts = true, dateRange = null }) {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);

  const data = useMemo(() => {
    let filtered = NATIONAL_MONTHLY;
    if (dateRange) {
      filtered = filtered.filter(d => d.date >= dateRange[0] && d.date <= dateRange[1]);
    }
    return filtered.map(d => ({ ...d, dateObj: parseDate(d.date) }));
  }, [dateRange]);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const containerWidth = svgRef.current.parentElement?.clientWidth || 800;
    const width = containerWidth;
    const height = Math.min(420, width * 0.5);
    const margin = { top: 24, right: 24, bottom: 40, left: 52 };

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.dateObj))
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.price) * 1.12])
      .range([height - margin.bottom, margin.top]);

    // Conflict bands
    const conflicts = showAllConflicts ? CONFLICTS : (highlightConflict ? [highlightConflict] : []);
    conflicts.forEach(c => {
      const x0 = x(parseDate(c.start));
      const x1 = x(parseDate(c.end));
      if (x1 < margin.left || x0 > width - margin.right) return;
      svg.append("rect")
        .attr("x", Math.max(x0, margin.left))
        .attr("y", margin.top)
        .attr("width", Math.min(x1, width - margin.right) - Math.max(x0, margin.left))
        .attr("height", height - margin.top - margin.bottom)
        .attr("fill", c.color)
        .attr("opacity", highlightConflict && c.id === highlightConflict.id ? 0.18 : 0.08);

      if (x1 - x0 > 30) {
        svg.append("text")
          .attr("x", (Math.max(x0, margin.left) + Math.min(x1, width - margin.right)) / 2)
          .attr("y", margin.top + 14)
          .attr("text-anchor", "middle")
          .attr("fill", c.color)
          .attr("font-size", "9px")
          .attr("font-family", FONT)
          .attr("opacity", 0.8)
          .text(c.name);
      }
    });

    // Grid
    const yTicks = y.ticks(5);
    yTicks.forEach(tick => {
      svg.append("line")
        .attr("x1", margin.left).attr("x2", width - margin.right)
        .attr("y1", y(tick)).attr("y2", y(tick))
        .attr("stroke", GRID).attr("stroke-width", 1);
    });

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(width > 600 ? 8 : 5).tickFormat(d3.timeFormat("'%y")))
      .call(g => g.select(".domain").attr("stroke", BORDER))
      .call(g => g.selectAll(".tick line").attr("stroke", BORDER))
      .call(g => g.selectAll(".tick text").attr("fill", TEXT_DIM).attr("font-size", "11px").attr("font-family", FONT));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => `$${d.toFixed(2)}`))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").remove())
      .call(g => g.selectAll(".tick text").attr("fill", TEXT_DIM).attr("font-size", "11px").attr("font-family", FONT));

    // Area
    const area = d3.area()
      .x(d => x(d.dateObj))
      .y0(height - margin.bottom)
      .y1(d => y(d.price))
      .curve(d3.curveMonotoneX);

    const gradient = svg.append("defs").append("linearGradient")
      .attr("id", "area-grad").attr("x1", "0").attr("y1", "0").attr("x2", "0").attr("y2", "1");
    gradient.append("stop").attr("offset", "0%").attr("stop-color", ACCENT).attr("stop-opacity", 0.25);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", ACCENT).attr("stop-opacity", 0.02);

    svg.append("path").datum(data).attr("d", area).attr("fill", "url(#area-grad)");

    // Line
    const line = d3.line().x(d => x(d.dateObj)).y(d => y(d.price)).curve(d3.curveMonotoneX);
    const path = svg.append("path").datum(data)
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", ACCENT)
      .attr("stroke-width", 2);

    // Animate line draw
    const totalLength = path.node().getTotalLength();
    path.attr("stroke-dasharray", totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition().duration(1800).ease(d3.easeCubicOut)
      .attr("stroke-dashoffset", 0);

    // ── Annotations ──
    if (showAllConflicts && width > 500) {
      const annotGroup = svg.append("g").attr("class", "annotations");
      const isMobileWidth = width < 700;
      // Filter to avoid overlap: on smaller screens show fewer
      const anns = isMobileWidth
        ? ANNOTATIONS.filter(a => ["2008-07", "2020-04", "2022-06", "2026-03"].includes(a.date))
        : ANNOTATIONS;

      anns.forEach((ann, i) => {
        // Find the data point closest to this annotation date
        const annDate = parseDate(ann.date);
        const bisect = d3.bisector(d => d.dateObj).left;
        const idx = bisect(data, annDate, 1);
        const dp = data[Math.min(idx, data.length - 1)];
        if (!dp) return;

        const cx = x(dp.dateObj);
        const cy = y(dp.price);
        if (cx < margin.left + 10 || cx > width - margin.right - 10) return;

        const isTop = ann.anchor === "top";
        const labelY = isTop ? Math.max(margin.top + 10, cy - 38) : Math.min(height - margin.bottom - 10, cy + 42);
        const lineEndY = isTop ? labelY + 12 : labelY - 12;

        // Connector line
        annotGroup.append("line")
          .attr("x1", cx).attr("x2", cx)
          .attr("y1", cy + (isTop ? -6 : 6)).attr("y2", lineEndY)
          .attr("stroke", ann.color).attr("stroke-width", 1)
          .attr("stroke-dasharray", "2,2")
          .attr("opacity", 0)
          .transition().delay(1800 + i * 100).duration(400)
          .attr("opacity", 0.6);

        // Dot on the line
        annotGroup.append("circle")
          .attr("cx", cx).attr("cy", cy)
          .attr("r", 3)
          .attr("fill", ann.color)
          .attr("opacity", 0)
          .transition().delay(1800 + i * 100).duration(400)
          .attr("opacity", 0.8);

        // Label background
        const labelText = ann.label;
        const estWidth = labelText.length * 5.2 + 12;
        annotGroup.append("rect")
          .attr("x", cx - estWidth / 2)
          .attr("y", isTop ? labelY - 10 : labelY - 6)
          .attr("width", estWidth)
          .attr("height", 16)
          .attr("rx", 4)
          .attr("fill", BG)
          .attr("opacity", 0)
          .transition().delay(1800 + i * 100 + 100).duration(400)
          .attr("opacity", 0.85);

        // Label text
        annotGroup.append("text")
          .attr("x", cx)
          .attr("y", isTop ? labelY + 2 : labelY + 6)
          .attr("text-anchor", "middle")
          .attr("fill", ann.color)
          .attr("font-size", isMobileWidth ? "7px" : "8.5px")
          .attr("font-family", FONT)
          .attr("font-weight", 600)
          .text(labelText)
          .attr("opacity", 0)
          .transition().delay(1800 + i * 100 + 150).duration(400)
          .attr("opacity", 1);
      });
    }

    // Interactive overlay
    const focus = svg.append("g").style("display", "none");
    focus.append("line").attr("class", "focus-line")
      .attr("y1", margin.top).attr("y2", height - margin.bottom)
      .attr("stroke", TEXT_DIM).attr("stroke-width", 1).attr("stroke-dasharray", "3,3");
    focus.append("circle").attr("r", 5).attr("fill", ACCENT).attr("stroke", BG).attr("stroke-width", 2);

    svg.append("rect")
      .attr("x", margin.left).attr("y", margin.top)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom)
      .attr("fill", "transparent")
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const date = x.invert(mx);
        const bisect = d3.bisector(d => d.dateObj).left;
        const i = bisect(data, date, 1);
        const d0 = data[i - 1], d1 = data[i];
        if (!d0 || !d1) return;
        const d = date - d0.dateObj > d1.dateObj - date ? d1 : d0;
        focus.style("display", null);
        focus.select("circle").attr("cx", x(d.dateObj)).attr("cy", y(d.price));
        focus.select(".focus-line").attr("x1", x(d.dateObj)).attr("x2", x(d.dateObj));
        if (tooltipRef.current) {
          const conflict = CONFLICTS.find(c => d.date >= c.start && d.date <= c.end);
          tooltipRef.current.style.display = "block";
          tooltipRef.current.style.left = `${x(d.dateObj)}px`;
          tooltipRef.current.style.top = `${y(d.price) - 12}px`;
          tooltipRef.current.innerHTML = `
            <div style="font-size:11px;color:${TEXT_DIM}">${fmtDate(d.date)}</div>
            <div style="font-size:16px;font-weight:700;color:${TEXT_BRIGHT}">${fmtPrice(d.price)}/gal</div>
            ${conflict ? `<div style="font-size:10px;color:${conflict.color};margin-top:2px">▎ ${conflict.name}</div>` : ""}
          `;
        }
      })
      .on("mouseleave", () => {
        focus.style("display", "none");
        if (tooltipRef.current) tooltipRef.current.style.display = "none";
      });

  }, [data, highlightConflict, showAllConflicts]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg ref={svgRef} style={{ width: "100%", height: "auto" }} />
      <div
        ref={tooltipRef}
        style={{
          display: "none", position: "absolute", pointerEvents: "none",
          background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8,
          padding: "8px 12px", transform: "translate(-50%, -100%)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}
      />
    </div>
  );
}

// ── PADD Region comparison chart ──
function RegionChart({ conflictId }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const conflict = CONFLICTS.find(c => c.id === conflictId) || CONFLICTS[CONFLICTS.length - 1];
  const startDate = parseDate(conflict.start);
  const preStart = new Date(startDate);
  preStart.setMonth(preStart.getMonth() - 6);
  const endDate = parseDate(conflict.end);
  const postEnd = new Date(endDate);
  postEnd.setMonth(postEnd.getMonth() + 3);

  const preStr = `${preStart.getFullYear()}-${String(preStart.getMonth()+1).padStart(2,"0")}`;
  const postStr = `${postEnd.getFullYear()}-${String(postEnd.getMonth()+1).padStart(2,"0")}`;

  const relevantNational = NATIONAL_MONTHLY.filter(d => d.date >= preStr && d.date <= postStr);

  useEffect(() => {
    if (!canvasRef.current || relevantNational.length === 0) return;
    if (chartRef.current) chartRef.current.destroy();

    const colors = ["#e63946", "#f4845f", "#2563eb", "#16a34a", "#a855f7"];
    const datasets = Object.entries(PADD_OFFSETS).map(([name, offset], i) => ({
      label: name,
      data: relevantNational.map(d => ({ x: d.date, y: +(d.price + offset + (Math.sin(i * 2 + relevantNational.indexOf(d)) * 0.04)).toFixed(2) })),
      borderColor: colors[i],
      backgroundColor: colors[i] + "15",
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.4,
      fill: false,
    }));

    chartRef.current = new Chart.Chart(canvasRef.current, {
      type: "line",
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: TEXT_DIM, font: { family: FONT, size: 11 }, boxWidth: 12, padding: 16 }
          },
          tooltip: {
            backgroundColor: BG_CARD,
            titleColor: TEXT_DIM,
            bodyColor: TEXT_BRIGHT,
            borderColor: BORDER,
            borderWidth: 1,
            cornerRadius: 8,
            titleFont: { family: FONT },
            bodyFont: { family: FONT, weight: "bold" },
            callbacks: { label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}` }
          }
        },
        scales: {
          x: {
            type: "category",
            grid: { color: GRID },
            ticks: { color: TEXT_DIM, font: { family: FONT, size: 10 }, maxTicksLimit: 8,
              callback: (v) => { const d = relevantNational[v]?.date; return d ? fmtDate(d) : ""; }
            }
          },
          y: {
            grid: { color: GRID },
            ticks: { color: TEXT_DIM, font: { family: FONT, size: 11 }, callback: (v) => `$${v.toFixed(2)}` }
          }
        },
        interaction: { mode: "index", intersect: false },
      }
    });

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [conflictId]);

  return (
    <div style={{ height: 340, position: "relative" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

// ── Import Sources Donut ──
// Country context snippets for the info panel
const COUNTRY_CONTEXT = {
  Canada: { flag: "🇨🇦", type: "Non-OPEC", barrel: "4.1M bbl/day to U.S.", note: "By far the largest single supplier. Heavy crude from Alberta's oil sands feeds Midwest refineries via the Keystone and Enbridge pipeline systems. Pipeline-delivered, so less exposed to maritime disruption." },
  "Saudi Arabia": { flag: "🇸🇦", type: "OPEC", barrel: "274K bbl/day to U.S.", note: "Once the dominant supplier at 24% in 1991, now just 4% of U.S. imports. Still holds the world's largest spare production capacity and anchors OPEC's pricing power. Exports through the Strait of Hormuz." },
  Mexico: { flag: "🇲🇽", type: "Non-OPEC", barrel: "464K bbl/day to U.S.", note: "Second-largest supplier. Heavy Maya crude feeds Gulf Coast refineries. Pipeline and tanker delivery via the Gulf of Mexico. Production has declined steadily since peaking in 2004." },
  Venezuela: { flag: "🇻🇪", type: "OPEC", barrel: "228K bbl/day to U.S.", note: "Imports collapsed to zero from 2019 to 2022 under U.S. sanctions, then partially resumed. Extra-heavy Orinoco crude requires specialized refining capacity, mostly on the Gulf Coast." },
  Iraq: { flag: "🇮🇶", type: "OPEC", barrel: "198K bbl/day to U.S.", note: "Exports were zeroed out during the Gulf War (1991) and severely disrupted during the 2003 invasion. Production has since recovered but remains vulnerable to regional instability. Exports through Hormuz and via Turkey." },
  Colombia: { flag: "🇨🇴", type: "Non-OPEC", barrel: "214K bbl/day to U.S.", note: "A steady mid-tier supplier. Heavy crude shipped by tanker to Gulf Coast refineries. Less geopolitically volatile than Middle Eastern sources but production is declining." },
  Brazil: { flag: "🇧🇷", type: "Non-OPEC", barrel: "221K bbl/day to U.S.", note: "A rising supplier, up from near zero in 2010. Deep-water pre-salt fields off the coast produce high-quality crude. Entirely maritime delivery, no pipeline connection to the U.S." },
  Russia: { flag: "🇷🇺", type: "Non-OPEC", barrel: "0 bbl/day to U.S.", note: "The U.S. banned Russian crude imports in March 2022 following the invasion of Ukraine. Russia redirected exports to China and India at steep discounts. Once supplied over 500K bbl/day to the U.S." },
  Guyana: { flag: "🇬🇾", type: "Non-OPEC", barrel: "176K bbl/day to U.S.", note: "The newest major entrant. ExxonMobil's Stabroek block began production in 2019 and ramped to nearly 650K bbl/day total by 2024. Light sweet crude, delivered by tanker to Gulf Coast and East Coast refineries." },
  Other: { flag: "🌍", type: "Various", barrel: "Multiple sources", note: "Includes Nigeria, Angola, Libya, Ecuador, Kazakhstan, Norway, United Kingdom, Trinidad, and dozens of smaller suppliers. The composition of this category shifts year to year based on pricing and geopolitics." },
};

function ImportDonut({ year }) {
  const mobile = useIsMobile();
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const sources = IMPORT_SOURCES_TIMELINE[year] || IMPORT_SOURCES_TIMELINE["2024"];

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const labels = Object.keys(sources);
    const dataVals = Object.values(sources);
    const colors = labels.map(l => SOURCE_COLORS[l] || "#6b7280");

    chartRef.current = new Chart.Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: dataVals,
          backgroundColor: colors,
          borderColor: BG_CARD,
          borderWidth: 3,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: TEXT, font: { family: FONT, size: 12 }, padding: 12, boxWidth: 14,
              generateLabels: (chart) => {
                const ds = chart.data.datasets[0];
                return chart.data.labels.map((l, i) => ({
                  text: `${l}  ${ds.data[i]}%`,
                  fillStyle: ds.backgroundColor[i],
                  strokeStyle: "transparent",
                  fontColor: TEXT,
                  index: i,
                }));
              }
            }
          },
          tooltip: { enabled: false },
        },
        onHover: (event, elements) => {
          if (elements.length > 0) {
            const idx = elements[0].index;
            const label = labels[idx];
            setHovered(label);
          } else {
            setHovered(null);
          }
        },
      }
    });

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [year]);

  const ctx = hovered ? COUNTRY_CONTEXT[hovered] : null;
  const hoveredPct = hovered ? sources[hovered] : null;

  return (
    <div>
      {/* Chart title/context */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: TEXT_DIM, lineHeight: 1.5 }}>
          <span style={{ color: TEXT, fontWeight: 600 }}>Exporter → U.S.</span> crude oil import share by country of origin.
          Hover a slice for details on each supplier relationship.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "280px 1fr", gap: 20, alignItems: "start" }}>
        {/* Left: info panel */}
        <div style={{
          background: `${BG}80`, borderRadius: 14, padding: 20,
          border: `1px solid ${BORDER}`,
          minHeight: mobile ? "auto" : 240,
          transition: "all 0.3s ease",
        }}>
          {ctx ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>{ctx.flag}</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: TEXT_BRIGHT, fontFamily: DISPLAY_FONT }}>
                    {hovered}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                    <span style={{
                      fontSize: 9, padding: "2px 6px", borderRadius: 4,
                      background: ctx.type === "OPEC" ? `${ACCENT}20` : `${BORDER}`,
                      color: ctx.type === "OPEC" ? ACCENT : TEXT_DIM,
                      fontWeight: 600, letterSpacing: 0.5,
                    }}>
                      {ctx.type}
                    </span>
                    <span style={{ fontSize: 11, color: TEXT_DIM }}>{ctx.barrel}</span>
                  </div>
                </div>
              </div>
              <div style={{
                fontSize: 32, fontWeight: 800, fontFamily: DISPLAY_FONT,
                color: SOURCE_COLORS[hovered] || TEXT_BRIGHT, marginBottom: 10,
              }}>
                {hoveredPct}%
              </div>
              <p style={{ fontSize: 12, color: TEXT_DIM, lineHeight: 1.6, margin: 0 }}>
                {ctx.note}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 200, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>🛢️</div>
              <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.5, maxWidth: 200 }}>
                Hover over a slice to explore each country's role in the U.S. oil supply chain
              </div>
            </div>
          )}
        </div>

        {/* Right: donut chart */}
        <div style={{ height: 280, position: "relative" }}>
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}

// ── Volatility sparklines ──
function VolatilityBars({ conflictId }) {
  const mobile = useIsMobile();
  const conflict = CONFLICTS.find(c => c.id === conflictId) || CONFLICTS[CONFLICTS.length - 1];
  const startDate = parseDate(conflict.start);
  const preStart = new Date(startDate);
  preStart.setMonth(preStart.getMonth() - 3);
  const preStr = `${preStart.getFullYear()}-${String(preStart.getMonth()+1).padStart(2,"0")}`;

  const prePrices = NATIONAL_MONTHLY.filter(d => d.date >= preStr && d.date < conflict.start).map(d => d.price);
  const duringPrices = NATIONAL_MONTHLY.filter(d => d.date >= conflict.start && d.date <= conflict.end).map(d => d.price);

  const preAvg = prePrices.length ? _.mean(prePrices) : 0;
  const duringAvg = duringPrices.length ? _.mean(duringPrices) : 0;
  const duringMax = duringPrices.length ? _.max(duringPrices) : 0;
  const pctChange = preAvg > 0 ? ((duringAvg - preAvg) / preAvg * 100) : 0;

  const regions = Object.entries(PADD_OFFSETS).map(([name, offset]) => {
    const regionDuring = duringAvg + offset;
    const regionPre = preAvg + offset;
    const regionPct = regionPre > 0 ? ((regionDuring - regionPre) / regionPre * 100) : 0;
    return { name: name.replace(" (PADD ", " (P").replace(")", ")"), pct: regionPct, avg: regionDuring };
  });

  const maxPct = Math.max(...regions.map(r => Math.abs(r.pct)), Math.abs(pctChange));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        <div style={{ background: BG_CARD, borderRadius: 12, padding: "16px 20px", border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 11, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 1 }}>Pre-Conflict Avg</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: TEXT_BRIGHT, fontFamily: DISPLAY_FONT }}>
            <AnimatedNumber value={preAvg} prefix="$" />
          </div>
        </div>
        <div style={{ background: BG_CARD, borderRadius: 12, padding: "16px 20px", border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 11, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 1 }}>During Conflict</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: ACCENT, fontFamily: DISPLAY_FONT }}>
            <AnimatedNumber value={duringAvg} prefix="$" />
          </div>
        </div>
        <div style={{ background: BG_CARD, borderRadius: 12, padding: "16px 20px", border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 11, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 1 }}>Peak Price</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: ACCENT_WARM, fontFamily: DISPLAY_FONT }}>
            <AnimatedNumber value={duringMax} prefix="$" />
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: TEXT_DIM, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
        Price Change by Region
      </div>
      {regions.map((r, i) => (
        <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{ width: mobile ? 90 : 140, fontSize: mobile ? 10 : 12, color: TEXT_DIM, textAlign: "right", flexShrink: 0 }}>{r.name}</div>
          <div style={{ flex: 1, height: 20, background: GRID, borderRadius: 4, overflow: "hidden", position: "relative" }}>
            <div style={{
              width: `${Math.abs(r.pct) / maxPct * 100}%`,
              height: "100%",
              background: r.pct > 0 ? `linear-gradient(90deg, ${ACCENT}88, ${ACCENT})` : `linear-gradient(90deg, #16a34a88, #16a34a)`,
              borderRadius: 4,
              transition: "width 0.8s ease",
              transitionDelay: `${i * 0.1}s`,
            }} />
          </div>
          <div style={{ width: 60, fontSize: 13, fontWeight: 600, color: r.pct > 0 ? ACCENT : "#16a34a", textAlign: "right" }}>
            {r.pct > 0 ? "+" : ""}{r.pct.toFixed(1)}%
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Conflict Card ──
function ConflictCard({ conflict, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: isActive ? `${conflict.color}15` : BG_CARD,
        border: `1px solid ${isActive ? conflict.color : BORDER}`,
        borderRadius: 12,
        padding: "14px 18px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.25s ease",
        width: "100%",
        outline: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: conflict.color }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: TEXT_BRIGHT, fontFamily: FONT }}>{conflict.name}</span>
      </div>
      <div style={{ fontSize: 11, color: TEXT_DIM, fontFamily: FONT }}>
        {fmtDate(conflict.start)} to {fmtDate(conflict.end)}
      </div>
    </button>
  );
}

// ── Local Insights Panel ──
function LocalInsights({ stateCode, conflict }) {
  const mobile = useIsMobile();
  const st = STATE_DATA[stateCode];
  if (!st) return null;

  const padd = st.padd;
  const paddName = PADD_NAMES[padd];
  const paddInfo = PADD_DETAILS[padd];
  const natAvg = NATIONAL_MONTHLY[NATIONAL_MONTHLY.length - 1]?.price || 3.50;
  const statePrice = natAvg + st.offset;
  const diff = st.offset;
  const taxRank = Object.values(STATE_DATA).filter(s => s.tax > st.tax).length + 1;
  const totalStates = Object.keys(STATE_DATA).length;

  // Conflict-specific local impact
  const c = conflict || CONFLICTS[CONFLICTS.length - 1];
  const duringPrices = NATIONAL_MONTHLY.filter(d => d.date >= c.start && d.date <= c.end).map(d => d.price);
  
  // Calculate pre-conflict date range (6 months before start)
  const preDate = parseDate(c.start);
  preDate.setMonth(preDate.getMonth() - 6);
  const preStr = `${preDate.getFullYear()}-${String(preDate.getMonth()+1).padStart(2,"0")}`;
  const prePrices = NATIONAL_MONTHLY.filter(d => d.date >= preStr && d.date < c.start).map(d => d.price);
  
  const localDuringAvg = (duringPrices.length ? _.mean(duringPrices) : natAvg) + st.offset;
  const localPreAvg = (prePrices.length ? _.mean(prePrices) : natAvg) + st.offset;
  const localPeak = (duringPrices.length ? _.max(duringPrices) : natAvg) + st.offset;
  const localPctChange = localPreAvg > 0 ? ((localDuringAvg - localPreAvg) / localPreAvg * 100) : 0;

  // Monthly cost estimate (avg US driver: 1,200 gal/year = 100 gal/month)
  const monthlyGallons = 100;
  const monthlyDiff = (localPeak - localPreAvg) * monthlyGallons;

  const vulnDots = Array.from({ length: 5 }, (_, i) => i < paddInfo.vulnScore);

  return (
    <div style={{
      background: `linear-gradient(135deg, ${BG_CARD}, #1a1418)`,
      borderRadius: 20, padding: 28,
      border: `1px solid ${ACCENT}25`,
      position: "relative", overflow: "hidden",
    }}>
      {/* Subtle glow */}
      <div style={{
        position: "absolute", top: -40, right: -40, width: 160, height: 160,
        background: `radial-gradient(circle, ${ACCENT}10, transparent 70%)`,
        borderRadius: "50%", pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
          <h3 style={{ fontFamily: DISPLAY_FONT, fontSize: 24, fontWeight: 700, color: TEXT_BRIGHT, margin: 0 }}>
            {st.name}
          </h3>
          <span style={{
            fontSize: 10, padding: "3px 8px", borderRadius: 4,
            background: `${ACCENT}15`, color: ACCENT, fontWeight: 600,
            letterSpacing: 1, textTransform: "uppercase",
          }}>
            {paddName}
          </span>
        </div>
        <p style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.6, margin: "0 0 24px 0", maxWidth: 600 }}>
          {paddInfo.desc}
        </p>

        {/* Key stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Current Est. Price", value: fmtPrice(statePrice), sub: diff > 0 ? `+${fmtPrice(diff)} vs national` : `${fmtPrice(diff)} vs national`, color: diff > 0 ? ACCENT : "#16a34a" },
            { label: "State Gas Tax", value: `${(st.tax * 100).toFixed(1)}¢`, sub: `#${taxRank} of ${totalStates}`, color: st.tax > 0.40 ? ACCENT_WARM : TEXT_BRIGHT },
            { label: `Peak During ${c.name}`, value: fmtPrice(localPeak), sub: `+${localPctChange.toFixed(1)}% from pre-conflict`, color: ACCENT },
            { label: "Monthly Cost Impact", value: monthlyDiff > 0 ? `+$${monthlyDiff.toFixed(0)}` : `$${monthlyDiff.toFixed(0)}`, sub: "at peak vs. pre-conflict", color: monthlyDiff > 20 ? ACCENT : ACCENT_WARM },
          ].map((item, i) => (
            <div key={i} style={{ background: `${BG}80`, borderRadius: 12, padding: "14px 16px", border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: item.color, fontFamily: DISPLAY_FONT }}>
                {item.value}
              </div>
              <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>{item.sub}</div>
            </div>
          ))}
        </div>

        {/* Supply vulnerability + refinery + breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          {/* Supply vulnerability */}
          <div style={{ background: `${BG}80`, borderRadius: 12, padding: "16px 20px", border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 11, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
              Supply Disruption Vulnerability
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {vulnDots.map((filled, i) => (
                <div key={i} style={{
                  width: 32, height: 8, borderRadius: 4,
                  background: filled
                    ? (paddInfo.vulnScore >= 4 ? ACCENT : paddInfo.vulnScore >= 3 ? ACCENT_WARM : "#16a34a")
                    : GRID,
                  transition: "background 0.3s ease",
                }} />
              ))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_BRIGHT }}>
              {paddInfo.vulnScore >= 4 ? "High" : paddInfo.vulnScore >= 3 ? "Moderate" : paddInfo.vulnScore >= 2 ? "Low-Moderate" : "Low"}
            </div>
            <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 4 }}>
              {st.refinery ? "Has local refinery capacity, providing a partial buffer against supply shocks (EIA State Energy Profiles)." : "No local refineries. This state is fully dependent on fuel transported from other regions, increasing its exposure to supply disruptions."}
            </div>
          </div>

          {/* Price breakdown */}
          <div style={{ background: `${BG}80`, borderRadius: 12, padding: "16px 20px", border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 11, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
              What You Pay Per Gallon
            </div>
            {[
              { label: "Crude oil cost", pct: 53, color: "#3b82f6" },
              { label: "Refining", pct: 14, color: "#8b5cf6" },
              { label: "Distribution & marketing", pct: 15, color: "#06b6d4" },
              { label: `Federal tax (18.4¢)`, pct: Math.round(0.184 / statePrice * 100), color: "#6b7280" },
              { label: `State tax (${(st.tax * 100).toFixed(1)}¢)`, pct: Math.round(st.tax / statePrice * 100), color: ACCENT_WARM },
            ].map((seg, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12, color: TEXT_DIM }}>{seg.label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_BRIGHT }}>{seg.pct}%</div>
              </div>
            ))}
            {/* Mini stacked bar */}
            <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginTop: 8 }}>
              {[
                { pct: 53, color: "#3b82f6" },
                { pct: 14, color: "#8b5cf6" },
                { pct: 15, color: "#06b6d4" },
                { pct: Math.round(0.184 / statePrice * 100), color: "#6b7280" },
                { pct: Math.round(st.tax / statePrice * 100), color: ACCENT_WARM },
              ].map((seg, i) => (
                <div key={i} style={{ width: `${seg.pct}%`, background: seg.color, transition: "width 0.5s ease" }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── State Selector (searchable dropdown) ──
function StateSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-focus search when opening
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const filtered = Object.entries(STATE_DATA)
    .filter(([code, st]) => st.name.toLowerCase().includes(search.toLowerCase()) || code.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a[1].name.localeCompare(b[1].name));

  const selected = value ? STATE_DATA[value] : null;

  return (
    <div ref={ref} style={{ width: "100%", maxWidth: 420 }}>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(!open); if (open) setSearch(""); }}
        style={{
          width: "100%", padding: "14px 18px", borderRadius: open ? "12px 12px 0 0" : 12,
          background: BG_CARD,
          borderLeft: `1px solid ${open ? ACCENT : BORDER}`,
          borderRight: `1px solid ${open ? ACCENT : BORDER}`,
          borderTop: `1px solid ${open ? ACCENT : BORDER}`,
          borderBottom: `1px solid ${BORDER}`,
          color: selected ? TEXT_BRIGHT : TEXT_DIM, fontSize: 14, fontFamily: FONT,
          cursor: "pointer", textAlign: "left", transition: "border-radius 0.3s ease",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <span>{selected ? selected.name : "Select your state..."}</span>
        <span style={{
          color: TEXT_DIM, fontSize: 11,
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.3s ease",
        }}>▼</span>
      </button>

      {/* Inline expanding panel */}
      <div style={{
        maxHeight: open ? 360 : 0,
        opacity: open ? 1 : 0,
        overflow: "hidden",
        transition: "max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease",
        background: BG_CARD,
        borderLeft: open ? `1px solid ${ACCENT}` : "1px solid transparent",
        borderRight: open ? `1px solid ${ACCENT}` : "1px solid transparent",
        borderBottom: open ? `1px solid ${ACCENT}` : "1px solid transparent",
        borderTop: "none",
        borderRadius: "0 0 12px 12px",
      }}>
        {/* Search input */}
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}` }}>
          <input
            ref={inputRef}
            placeholder="Search states..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 8,
              background: BG, border: `1px solid ${BORDER}`, color: TEXT_BRIGHT,
              fontSize: 13, fontFamily: FONT, outline: "none", boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
            onFocus={e => e.target.style.borderColor = ACCENT}
            onBlur={e => e.target.style.borderColor = BORDER}
          />
        </div>

        {/* State list */}
        <div style={{ overflowY: "auto", maxHeight: 280 }}>
          {filtered.map(([code, st]) => (
            <button
              key={code}
              onClick={() => { onChange(code); setOpen(false); setSearch(""); }}
              style={{
                width: "100%", padding: "11px 18px", border: "none",
                background: code === value ? `${ACCENT}15` : "transparent",
                color: code === value ? ACCENT : TEXT, fontSize: 13, fontFamily: FONT,
                cursor: "pointer", textAlign: "left", display: "flex",
                alignItems: "center", justifyContent: "space-between",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { if (code !== value) e.target.style.background = "#252525"; }}
              onMouseLeave={e => { if (code !== value) e.target.style.background = "transparent"; }}
            >
              <span>{st.name}</span>
              <span style={{ fontSize: 11, color: TEXT_DIM }}>{PADD_NAMES[st.padd].split(" (")[0]}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "20px", textAlign: "center", color: TEXT_DIM, fontSize: 13 }}>No states found</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════
export default function App() {
  const [mode, setMode] = useState("story"); // "story" | "explore"
  const [activeConflict, setActiveConflict] = useState(CONFLICTS[CONFLICTS.length - 1]);
  const [importYear, setImportYear] = useState("2024");
  const [scrollY, setScrollY] = useState(0);
  const [heroHeight, setHeroHeight] = useState(800);
  const [activeStoryChapter, setActiveStoryChapter] = useState(STORY_CHAPTERS[0].id);
  const [userState, setUserState] = useState(null);
  const [forecastInput, setForecastInput] = useState(null);
  const [forecastResult, setForecastResult] = useState(null);
  const [forecastError, setForecastError] = useState(null);
  const [forecastWarning, setForecastWarning] = useState(null);
  const [forecastPanelOpen, setForecastPanelOpen] = useState(false);
  const mobile = useIsMobile();

  // Map conflict to closest import source year
  const conflictToImportYear = useCallback((c) => {
    const years = Object.keys(IMPORT_SOURCES_TIMELINE).map(Number);
    const conflictYear = parseInt(c.start.split("-")[0]);
    return String(years.reduce((prev, curr) => Math.abs(curr - conflictYear) < Math.abs(prev - conflictYear) ? curr : prev));
  }, []);

  // When conflict changes, sync the import year
  const handleConflictChange = useCallback((c) => {
    setActiveConflict(c);
    setImportYear(conflictToImportYear(c));
  }, [conflictToImportYear]);

  const handleForecastSubmit = useCallback((inputText) => {
    setForecastError(null);
    setForecastWarning(null);
    const classification = classifyScenario(inputText);
    if (!classification) {
      setForecastResult(null);
      setForecastInput(null);
      setForecastError("noMatch");
      return;
    }
    const eventDate = parseEventDate(inputText);
    if (isEventBeforeAnchor(eventDate)) {
      setForecastResult(null);
      setForecastInput(null);
      setForecastError("past");
      return;
    }
    const farFuture = eventDate.year >= 2035;
    setForecastWarning(farFuture ? "farFuture" : null);
    const result = generateForecast(classification, eventDate, userState, { farFutureBand: farFuture });
    setForecastInput(inputText);
    setForecastResult({ ...result, classification });
  }, [userState]);

  const scrollToStoryChapter = useCallback((chapterId) => {
    const el = document.getElementById(chapterId);
    if (!el) return;
    const yWin = window.scrollY;
    const topBar = yWin > heroHeight * 0.8 ? 56 : 0;
    const y = el.getBoundingClientRect().top + yWin - topBar - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }, [heroHeight]);

  useEffect(() => {
    const syncHeroHeight = () => setHeroHeight(window.innerHeight);
    syncHeroHeight();
    window.addEventListener("resize", syncHeroHeight);
    return () => window.removeEventListener("resize", syncHeroHeight);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrollY(y);
      if (mode === "story") {
        const topBar = y > heroHeight * 0.8 ? 56 : 0;
        const readingLine = topBar + 72;
        let current = STORY_CHAPTERS[0].id;
        for (const ch of STORY_CHAPTERS) {
          const el = document.getElementById(ch.id);
          if (!el) continue;
          if (el.getBoundingClientRect().top <= readingLine) current = ch.id;
        }
        setActiveStoryChapter(current);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mode, heroHeight]);

  // ── STORY MODE ──
  if (mode === "story") {
    const sidebarTop = scrollY > heroHeight * 0.8 ? 56 : 22;
    return (
      <div style={{
        background: BG, color: TEXT, fontFamily: FONT, minHeight: "100vh",
        paddingLeft: mobile ? 0 : 196,
        boxSizing: "border-box",
      }}>
        {!mobile && (
          <nav
            aria-label="Story chapters"
            style={{
              position: "fixed",
              left: 0,
              top: sidebarTop,
              width: 196,
              maxHeight: `calc(100vh - ${sidebarTop + 20}px)`,
              overflowY: "auto",
              overflowX: "hidden",
              zIndex: 150,
              padding: "10px 12px 20px 16px",
              background: `${BG}e6`,
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              borderRight: `1px solid ${BORDER}`,
              boxSizing: "border-box",
            }}
          >
            <div style={{
              fontSize: 9,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              color: TEXT_DIM,
              fontWeight: 600,
              marginBottom: 12,
              paddingLeft: 10,
              fontFamily: FONT,
            }}>
              In this story
            </div>
            {STORY_CHAPTERS.map((ch) => {
              const active = activeStoryChapter === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => scrollToStoryChapter(ch.id)}
                  style={{
                    width: "100%",
                    display: "block",
                    textAlign: "left",
                    background: active ? `${ACCENT}14` : "transparent",
                    border: "none",
                    borderLeft: `2px solid ${active ? ACCENT : "transparent"}`,
                    cursor: "pointer",
                    padding: "7px 8px 7px 10px",
                    marginBottom: 1,
                    borderRadius: "0 8px 8px 0",
                    transition: "background 0.2s ease, border-color 0.2s ease",
                    fontFamily: FONT,
                  }}
                >
                  {ch.sub && (
                    <div style={{
                      fontSize: 9,
                      letterSpacing: 1.5,
                      textTransform: "uppercase",
                      color: active ? ACCENT : TEXT_DIM,
                      fontWeight: 600,
                      marginBottom: 3,
                    }}>
                      {ch.sub}
                    </div>
                  )}
                  <div style={{
                    fontSize: 12,
                    fontWeight: active ? 600 : 500,
                    color: active ? TEXT_BRIGHT : TEXT_DIM,
                    lineHeight: 1.35,
                  }}>
                    {ch.label}
                  </div>
                </button>
              );
            })}
          </nav>
        )}
        {/* Sticky story nav - appears after scrolling past hero */}
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
          background: `${BG}f0`, backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${BORDER}`,
          padding: "10px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          transform: scrollY > heroHeight * 0.8 ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          pointerEvents: scrollY > heroHeight * 0.8 ? "auto" : "none",
        }}>
          <span style={{ fontFamily: DISPLAY_FONT, fontSize: 15, fontWeight: 700, color: TEXT_BRIGHT }}>
            The Price of Conflict
          </span>
          <button
            onClick={() => { setMode("explore"); window.scrollTo(0, 0); }}
            style={{
              padding: "7px 18px", fontSize: 11, fontWeight: 700, fontFamily: FONT,
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_WARM})`,
              color: "#fff", border: "none", borderRadius: 6, cursor: "pointer",
              transition: "transform 0.2s, opacity 0.2s",
              letterSpacing: 0.5,
            }}
            onMouseEnter={e => e.target.style.transform = "scale(1.04)"}
            onMouseLeave={e => e.target.style.transform = "scale(1)"}
          >
            Open Dashboard →
          </button>
        </div>
        {/* Hero */}
        <section
          id="story-hero"
          style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center", padding: "0 24px",
          position: "relative", overflow: "hidden",
        }}
        >
          <div style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${ACCENT}12, transparent 70%)`,
          }} />
          <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 800 }}>
            <div style={{
              fontSize: 12, letterSpacing: 4, textTransform: "uppercase", color: ACCENT,
              marginBottom: 24, fontWeight: 600,
            }}>
              A Visual Guide
            </div>
            <h1 style={{
              fontFamily: DISPLAY_FONT, fontSize: "clamp(42px, 7vw, 80px)", fontWeight: 800,
              lineHeight: 1.05, margin: 0, color: TEXT_BRIGHT,
              background: `linear-gradient(135deg, ${TEXT_BRIGHT}, ${ACCENT_WARM})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              The Price<br />of Conflict
            </h1>
            <p style={{
              fontSize: "clamp(15px, 2.2vw, 19px)", lineHeight: 1.6, color: TEXT_DIM,
              maxWidth: 560, margin: "24px auto 0",
            }}>
              Gas prices are shaped by crude oil markets, refinery capacity, seasonal
              demand, state taxes, and global events. This is an interactive guide
              to all of it, built on data from the EIA, Federal Reserve, and
              peer-reviewed economic research.
            </p>
            <div style={{ marginTop: 36, marginBottom: 28 }}>
              <GasPumpSign price={4.18} />
            </div>
            <div style={{ marginTop: 48, animation: "bounce 2s ease infinite" }}>
              <div style={{ fontSize: 11, color: TEXT_DIM, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
                Scroll to explore
              </div>
              <div style={{ fontSize: 24, color: TEXT_DIM }}>↓</div>
            </div>
          </div>
          <style>{`@keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(8px); } }`}</style>
        </section>

        {/* Hero stat strip */}
        <section
          id="story-stats"
          style={{
          maxWidth: 960, margin: "0 auto", padding: "20px 24px 60px",
        }}
        >
          <FadeIn>
            <div style={{
              display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 1,
              background: BORDER, borderRadius: 16, overflow: "hidden",
            }}>
              {[
                { label: "Avg. household gas spending", value: "$2,780", sub: "Per year, 2022 (EIA STEO)" },
                { label: "Factors affecting your price", value: "5+", sub: "Crude oil, refining, transport, taxes, events" },
                { label: "National average today", value: "$4.18", sub: "Regular grade, March 2026" },
              ].map((stat, i) => (
                <div key={i} style={{
                  background: BG_CARD, padding: "24px 20px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 32, fontWeight: 800, fontFamily: DISPLAY_FONT, color: i === 2 ? ACCENT : TEXT_BRIGHT }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_BRIGHT, marginTop: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>{stat.sub}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </section>

        {/* Wake-up call */}
        <section id="story-drivers" style={{ maxWidth: 960, margin: "0 auto", padding: "20px 24px 80px" }}>
          <FadeIn>
            <div style={{
              background: BG_CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 20, padding: mobile ? "32px 24px" : "48px 48px",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                display: "none",
              }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{
                  fontFamily: DISPLAY_FONT, fontSize: mobile ? 22 : 28, fontWeight: 700,
                  color: TEXT_BRIGHT, lineHeight: 1.3, marginBottom: 20,
                }}>
                  Understanding What Drives Gas Prices
                </div>
                <div style={{
                  display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 20,
                  fontSize: 14, color: TEXT_DIM, lineHeight: 1.7,
                }}>
                  <p style={{ margin: 0 }}>
                    The price on the pump sign is the end of a long chain: crude oil is
                    extracted, traded on global commodity markets, refined into gasoline,
                    transported by pipeline or tanker, and taxed at the federal and state
                    level before it reaches you. Each link adds cost, and each has its own
                    set of variables. Crude oil alone typically accounts for about 53% of
                    what you pay per gallon.
                  </p>
                  <p style={{ margin: 0 }}>
                    Most of the time, prices shift gradually with seasonal demand and
                    refinery maintenance schedules. But when a major supply disruption
                    hits, from a geopolitical conflict, a natural disaster, or a policy
                    shift, the system's vulnerabilities surface quickly. This guide breaks
                    down each factor so you can read the signals behind the price.
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* Chapter 1: The Full Timeline - FULL WIDTH, no card */}
        <section id="story-ch1" style={{ padding: mobile ? "60px 16px" : "80px 24px" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <FadeIn>
              <div style={{ fontSize: 11, color: ACCENT, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
                Chapter 01
              </div>
              <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 700, color: TEXT_BRIGHT, marginBottom: 8, lineHeight: 1.1 }}>
                35 Years of Gas Prices
              </h2>
              <p style={{ fontSize: 16, color: TEXT_DIM, lineHeight: 1.7, maxWidth: 600, marginBottom: 48 }}>
                Gas prices respond to a mix of global supply, seasonal demand, and geopolitical
                events. The shaded bands highlight periods where conflicts in oil-producing
                regions created supply uncertainty. Crude spot prices doubled during the 1990
                Gulf War and surged again in 2008, 2011, 2022, and 2025. But prices also move
                with refinery outages, OPEC decisions, and shifts in global demand. Research shows
                that gas price changes flow directly through to household spending patterns.
              </p>
            </FadeIn>
          </div>
          {/* Chart breaks out of the text column */}
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <FadeIn delay={0.15}>
              <PriceChart showAllConflicts={true} />
            </FadeIn>
          </div>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <FadeIn delay={0.2}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24, justifyContent: "center" }}>
                {CONFLICTS.map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: TEXT_DIM }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: c.color }} />
                    {c.name}
                  </div>
                ))}
              </div>
            </FadeIn>
            <FadeIn delay={0.25}>
              <div style={{ marginTop: 40 }}>
                <ConflictScrubber />
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Interstitial - full viewport, centered */}
        <section
          id="story-chain"
          style={{
          minHeight: mobile ? "auto" : "60vh",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: mobile ? "60px 24px" : "80px 24px", textAlign: "center",
          background: `linear-gradient(180deg, transparent, ${ACCENT}06, transparent)`,
        }}
        >
          <FadeIn>
            <div style={{ maxWidth: 680, margin: "0 auto" }}>
              <div style={{
                fontSize: "clamp(24px, 4vw, 40px)", fontFamily: DISPLAY_FONT, fontWeight: 700,
                color: TEXT_BRIGHT, lineHeight: 1.4, marginBottom: 24,
              }}>
                When supply is disrupted, the chain is predictable:<br />
                <span style={{ color: ACCENT }}>event → uncertainty → price adjustment → your budget</span>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: mobile ? 12 : 24, flexWrap: "wrap" }}>
                {["Supply event occurs", "Markets price in risk", "Inventories tighten", "Wholesale prices rise", "Retail prices follow"].map((step, i) => (
                  <FadeIn key={step} delay={i * 0.12}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: `${ACCENT}${15 + i * 15}`,
                        border: `1px solid ${ACCENT}40`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, color: ACCENT,
                      }}>
                        {i + 1}
                      </div>
                      <span style={{ fontSize: 13, color: i === 4 ? ACCENT : TEXT_DIM, fontWeight: i === 4 ? 700 : 400 }}>
                        {step}
                      </span>
                      {i < 4 && <span style={{ color: TEXT_DIM, opacity: 0.3, fontSize: 16 }}>→</span>}
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </FadeIn>
        </section>

        {/* The Cost - text left, chart right on desktop */}
        <section id="story-cost" style={{ maxWidth: 1060, margin: "0 auto", padding: "40px 24px 80px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : "340px 1fr",
            gap: mobile ? 32 : 48,
            alignItems: "start",
          }}>
            <FadeIn>
              <div style={{ position: mobile ? "static" : "sticky", top: 120 }}>
                <div style={{ fontSize: 11, color: ACCENT, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
                  The Cost of Disruptions
                </div>
                <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: mobile ? 28 : 34, fontWeight: 700, color: TEXT_BRIGHT, marginBottom: 12, lineHeight: 1.15 }}>
                  What Supply Disruptions Cost Households
                </h2>
                <p style={{ fontSize: 15, color: TEXT_DIM, lineHeight: 1.7 }}>
                  The average American household spent $2,780 on gasoline in 2022. Federal Reserve
                  research shows gasoline price shocks explain 69% of the variation in monthly
                  headline inflation. When gas prices move, they pull grocery costs, shipping
                  rates, and airfares with them.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <HouseholdCostTicker />
            </FadeIn>
          </div>
        </section>

        {/* Regional - chart left, text right on desktop */}
        <section id="story-ch2" style={{ maxWidth: 1060, margin: "0 auto", padding: "40px 24px 80px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : "1fr 340px",
            gap: mobile ? 32 : 48,
            alignItems: "start",
          }}>
            <FadeIn>
              <div style={{ background: BG_CARD, borderRadius: 16, padding: mobile ? 16 : 24, border: `1px solid ${BORDER}` }}>
                <RegionChart conflictId="iran-war" />
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div style={{ position: mobile ? "static" : "sticky", top: 120 }}>
                <div style={{ fontSize: 11, color: ACCENT, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
                  Chapter 02
                </div>
                <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: mobile ? 28 : 34, fontWeight: 700, color: TEXT_BRIGHT, marginBottom: 12, lineHeight: 1.15 }}>
                  Why Prices Vary by Region
                </h2>
                <p style={{ fontSize: 15, color: TEXT_DIM, lineHeight: 1.7 }}>
                  The U.S. is divided into five petroleum districts (PADDs), each with different
                  refinery capacity, pipeline access, and fuel requirements. The West Coast
                  consistently pays the most due to California's strict fuel standards and
                  geographic isolation from Gulf Coast refineries. During the 2022 spike,
                  California exceeded $6.40 per gallon while Gulf states stayed below $4.20.
                </p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Supply chain - then vs now narrative */}
        <section id="story-ch3" style={{ padding: "40px 24px 80px" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <FadeIn>
              <div style={{ fontSize: 11, color: ACCENT, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
                Chapter 03
              </div>
              <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 700, color: TEXT_BRIGHT, marginBottom: 8, lineHeight: 1.1 }}>
                Where U.S. Oil Comes From
              </h2>
              <p style={{ fontSize: 16, color: TEXT_DIM, lineHeight: 1.7, maxWidth: 600, marginBottom: 48 }}>
                The U.S. import mix has shifted dramatically. In 1991, Saudi Arabia supplied
                24% of U.S. crude, with no single country above a quarter. By 2024, Canada
                alone provides 62%, mostly via pipeline from Alberta. But crude is priced
                globally. The Strait of Hormuz carries about 20 million barrels per day,
                roughly 20% of global consumption. The IEA's
                {" "}<a href="https://www.iea.org/reports/oil-market-report-march-2026" target="_blank" rel="noopener" style={{color:TEXT_DIM,textDecoration:"underline"}}>March 2026 Oil Market Report</a>{" "}
                documented the scale of the current Hormuz disruption.
                Because oil is globally traded, a disruption anywhere affects prices
                everywhere, regardless of where a country sources its own supply.
              </p>
            </FadeIn>
          </div>

          {/* Then vs Now: side by side flow diagrams */}
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <FadeIn delay={0.1}>
              <div style={{
                display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
                gap: 24,
              }}>
                <div style={{ background: BG_CARD, borderRadius: 16, padding: mobile ? 12 : 20, border: `1px solid ${BORDER}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{
                      fontSize: 10, padding: "3px 8px", borderRadius: 4,
                      background: `${BORDER}`, color: TEXT_DIM, fontWeight: 600,
                      letterSpacing: 1, textTransform: "uppercase",
                    }}>1991</div>
                    <span style={{ fontSize: 12, color: TEXT_DIM }}>Diversified, Middle East heavy</span>
                  </div>
                  <OilFlowDiagram year="1991" />
                </div>
                <div style={{ background: BG_CARD, borderRadius: 16, padding: mobile ? 12 : 20, border: `1px solid ${ACCENT}25` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{
                      fontSize: 10, padding: "3px 8px", borderRadius: 4,
                      background: `${ACCENT}15`, color: ACCENT, fontWeight: 600,
                      letterSpacing: 1, textTransform: "uppercase",
                    }}>2024</div>
                    <span style={{ fontSize: 12, color: TEXT_DIM }}>Canada dominant, pipeline-based</span>
                  </div>
                  <OilFlowDiagram year="2024" />
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p style={{
                fontSize: 13, color: TEXT_DIM, lineHeight: 1.7, textAlign: "center",
                maxWidth: 640, margin: "24px auto 0",
              }}>
                The shift from seaborne Middle Eastern crude to pipeline-delivered Canadian heavy
                oil has reduced some maritime vulnerability. But the U.S. still imports from over
                30 countries, and global pricing means a supply shock in the Persian Gulf raises
                costs at every refinery, not just those processing Gulf crude. Explore the full
                breakdown across all years in the interactive dashboard.
              </p>
            </FadeIn>
          </div>
        </section>

        {/* Your State - centered, then expandable detail */}
        <section id="story-ch4" style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px 80px" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 11, color: ACCENT, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
                Chapter 04
              </div>
              <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 700, color: TEXT_BRIGHT, marginBottom: 12, lineHeight: 1.1 }}>
                Your Local Price Picture
              </h2>
              <p style={{ fontSize: 16, color: TEXT_DIM, lineHeight: 1.7, maxWidth: 560, margin: "0 auto 32px" }}>
                State-level gas taxes range from 9.0 cents per gallon in Alaska to 70.9 cents
                in California. Combined with differences in refinery access, fuel formulation
                rules, and pipeline proximity, the same national price movement lands differently
                depending on where you live.
              </p>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <StateSelector value={userState} onChange={setUserState} />
              </div>
            </div>
          </FadeIn>
          {userState && (
            <FadeIn delay={0.05}>
              <div style={{
                display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
                gap: 24, marginTop: 24,
              }}>
                <LocalInsights stateCode={userState} conflict={CONFLICTS[CONFLICTS.length - 1]} />
                <PocketImpact stateCode={userState} conflict={CONFLICTS[CONFLICTS.length - 1]} />
              </div>
            </FadeIn>
          )}
        </section>

        {/* Call to awareness */}
        <section
          id="story-factors"
          style={{
          padding: mobile ? "60px 24px" : "80px 24px", textAlign: "center",
          background: `linear-gradient(180deg, transparent, ${ACCENT}08, transparent)`,
        }}
        >
          <FadeIn>
            <div style={{ maxWidth: 640, margin: "0 auto" }}>
              <div style={{
                fontFamily: DISPLAY_FONT, fontSize: mobile ? 26 : 38, fontWeight: 800,
                color: TEXT_BRIGHT, lineHeight: 1.25, marginBottom: 20,
              }}>
                What Moves the Price
              </div>
              <p style={{ fontSize: 15, color: TEXT_DIM, lineHeight: 1.7, marginBottom: 24 }}>
                Gas prices are the product of five interlocking factors: the global crude oil
                price, refinery capacity and utilization, transportation and distribution costs,
                federal and state taxes, and geopolitical events that disrupt supply chains. No
                single factor dominates all the time, but understanding how they interact makes
                price movements far less mysterious.
              </p>
              <p style={{ fontSize: 15, color: TEXT_DIM, lineHeight: 1.7, marginBottom: 0 }}>
                The data behind this guide is public. The more you understand the system,
                the better equipped you are to anticipate what's coming and plan accordingly.
              </p>
            </div>
          </FadeIn>
        </section>

        {/* Scenario forecast simulator */}
        <section
          id="story-forecast"
          style={{
            maxWidth: 960, margin: "0 auto", padding: "40px 24px 80px",
            background: `linear-gradient(180deg, transparent, ${ACCENT}05, transparent)`,
          }}
        >
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 11, color: ACCENT, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
                Chapter 05
              </div>
              <h2 style={{
                fontFamily: DISPLAY_FONT, fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 700, color: TEXT_BRIGHT,
                marginBottom: 12, lineHeight: 1.1,
              }}>
                What Could Happen Next?
              </h2>
            </div>
          </FadeIn>
          <FadeIn delay={0.08}>
            <ScenarioInput onSubmit={handleForecastSubmit} mobile={mobile} />
          </FadeIn>
          {forecastError === "noMatch" && (
            <FadeIn delay={0.05}>
              <div style={{
                maxWidth: 800, margin: "20px auto 0", padding: 16, borderRadius: 12,
                background: BG_CARD, borderWidth: 1, borderStyle: "solid", borderColor: "#f59e0b",
                color: TEXT_DIM, fontSize: 14, lineHeight: 1.55,
              }}>
                I couldn&apos;t identify a specific event type from your description. Try mentioning a type of event (war, sanctions, hurricane, recession) and a timeframe.
              </div>
            </FadeIn>
          )}
          {forecastError === "past" && (
            <FadeIn delay={0.05}>
              <div style={{
                maxWidth: 800, margin: "20px auto 0", padding: 16, borderRadius: 12,
                background: BG_CARD, borderWidth: 1, borderStyle: "solid", borderColor: "#f59e0b",
                color: TEXT_DIM, fontSize: 14, lineHeight: 1.55,
              }}>
                This event date is in the past. The forecast works for future scenarios. Try a date in 2026 or later.
              </div>
            </FadeIn>
          )}
          {forecastWarning === "farFuture" && forecastResult && (
            <div style={{
              maxWidth: 800, margin: "16px auto 0", padding: 14, borderRadius: 12,
              background: `${ACCENT}10`, border: `1px solid ${ACCENT}35`, color: TEXT_DIM, fontSize: 13, lineHeight: 1.5,
            }}>
              Forecasts beyond 2035 have very high uncertainty. Showing results but note the wide confidence band.
            </div>
          )}
          {forecastInput && forecastResult && (
            <div style={{ maxWidth: 800, margin: "12px auto 0", fontSize: 12, color: TEXT_DIM, fontStyle: "italic" }}>
              Scenario: {forecastInput}
            </div>
          )}
          {forecastResult && (
            <FadeIn delay={0.1}>
              <ForecastChart forecast={forecastResult} mobile={mobile} />
              <ForecastResults forecast={forecastResult} classification={forecastResult.classification} mobile={mobile} />
            </FadeIn>
          )}
        </section>

        {/* CTA to Explorer */}
        <section
          id="story-explore"
          style={{
          maxWidth: 960, margin: "0 auto", padding: "60px 24px 100px", textAlign: "center",
        }}
        >
          <FadeIn>
            <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, color: TEXT_BRIGHT, marginBottom: 16 }}>
              Explore the Full Dataset
            </h2>
            <p style={{ fontSize: 16, color: TEXT_DIM, maxWidth: 500, margin: "0 auto 32px", lineHeight: 1.6 }}>
              Compare disruptions, filter by region, check your state's numbers.
              The interactive dashboard puts 35 years of data at your fingertips.
            </p>
            <button
              onClick={() => { setMode("explore"); window.scrollTo(0, 0); }}
              style={{
                padding: "16px 48px", fontSize: 16, fontWeight: 700, fontFamily: FONT,
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_WARM})`,
                color: "#fff", border: "none", borderRadius: 12, cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                boxShadow: `0 4px 24px ${ACCENT}40`,
              }}
              onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = `0 8px 32px ${ACCENT}60`; }}
              onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = `0 4px 24px ${ACCENT}40`; }}
            >
              Open Interactive Explorer →
            </button>
          </FadeIn>
        </section>

        {/* About This Project */}
        <section id="story-about" style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px 60px" }}>
          <FadeIn>
            <div style={{
              background: BG_CARD, borderRadius: 20, padding: mobile ? 24 : 36,
              border: `1px solid ${BORDER}`,
            }}>
              <div style={{ fontSize: 11, color: ACCENT, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>
                About This Project
              </div>
              <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: mobile ? 22 : 28, fontWeight: 700, color: TEXT_BRIGHT, marginBottom: 20, marginTop: 0, lineHeight: 1.2 }}>
                Design Rationale
              </h2>
              <div style={{
                display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 24,
                fontSize: 13, color: TEXT_DIM, lineHeight: 1.7,
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_BRIGHT, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                    Structure
                  </div>
                  <p style={{ margin: "0 0 16px 0" }}>
                    The project uses a two-mode architecture: a guided scroll narrative for first-time visitors
                    and a free-form explorer for repeat analysis. This pattern mirrors how Netflix's own
                    content analytics tools balance storytelling with self-service exploration. The scroll
                    narrative establishes context before asking the user to interact, reducing cognitive load.
                  </p>
                  <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_BRIGHT, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                    Typography
                  </div>
                  <p style={{ margin: "0 0 16px 0" }}>
                    Playfair Display (serif) handles headings and large numbers, providing editorial weight
                    and visual hierarchy. Libre Franklin (sans-serif) handles body text and UI labels for
                    readability at small sizes. This pairing draws from data journalism conventions at
                    outlets like The Pudding and ProPublica, where a display serif signals authority while a
                    geometric sans keeps dense information legible.
                  </p>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_BRIGHT, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                    Color
                  </div>
                  <p style={{ margin: "0 0 16px 0" }}>
                    The dark background (#0a0a0a) maximizes contrast for data-dense visualizations and
                    reduces eye strain during extended analysis. The red accent (#e63946) was chosen for its
                    association with urgency, cost, and loss, reinforcing the editorial thesis. Each conflict
                    has a unique hue mapped to its geographic region, enabling quick visual scanning across the timeline.
                    The palette passes WCAG AA contrast requirements against the dark background.
                  </p>
                  <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_BRIGHT, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                    Chart Design
                  </div>
                  <p style={{ margin: 0 }}>
                    The primary timeline uses D3.js for full control over annotations, animated line draws,
                    and interactive tooltips. Chart.js handles the simpler comparative charts where its built-in
                    responsiveness and legend management reduce development time. The Sankey-style oil flow
                    diagram was built in D3 to show proportional relationships that a standard bar chart
                    cannot convey. All charts use progressive disclosure: hover for detail, scroll for context.
                  </p>
                </div>
              </div>
              <div style={{
                marginTop: 24, paddingTop: 20, borderTop: `1px solid ${BORDER}`,
                fontSize: 12, color: TEXT_DIM, lineHeight: 1.6,
              }}>
                <span style={{ fontWeight: 600, color: TEXT_BRIGHT }}>Technical stack:</span> React, D3.js, Chart.js, deployed on Vercel.
                No external API calls required; all data is embedded from EIA, BLS, and Tax Foundation sources
                for reliability and fast load times. Responsive layout adapts to mobile, tablet, and desktop viewports.
              </div>
            </div>
          </FadeIn>
        </section>

        {/* Story Footer */}
        <footer id="story-sources" style={{ padding: "40px 24px", borderTop: `1px solid ${BORDER}` }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{ fontSize: 12, color: TEXT_DIM, fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
              Sources &amp; Methodology
            </div>
            <div style={{ fontSize: 11, color: TEXT_DIM, lineHeight: 1.8 }}>
              Gasoline price data: <a href="https://www.eia.gov/dnav/pet/pet_pri_gnd_dcus_nus_w.htm" target="_blank" rel="noopener" style={{color:TEXT_DIM,textDecoration:"underline"}}>U.S. Energy Information Administration (EIA), Weekly Retail Gasoline Prices</a>
              <br />
              Crude oil imports by country: <a href="https://afdc.energy.gov/data/10621" target="_blank" rel="noopener" style={{color:TEXT_DIM,textDecoration:"underline"}}>EIA Monthly Energy Review, April 2025, Tables 3.3c/3.3d</a> and <a href="https://www.eia.gov/dnav/pet/pet_move_impcus_a2_nus_epc0_im0_mbblpd_a.htm" target="_blank" rel="noopener" style={{color:TEXT_DIM,textDecoration:"underline"}}>EIA U.S. Crude Oil Imports</a>
              <br />
              PADD regional pricing: <a href="https://www.eia.gov/energyexplained/gasoline/regional-price-differences.php" target="_blank" rel="noopener" style={{color:TEXT_DIM,textDecoration:"underline"}}>EIA, Regional Gasoline Price Differences</a>
              <br />
              State gas tax rates: <a href="https://taxfoundation.org/data/all/state/gas-taxes-state/" target="_blank" rel="noopener" style={{color:TEXT_DIM,textDecoration:"underline"}}>Tax Foundation, 2025 State Gas Tax Rates</a>
              <br />
              Strait of Hormuz: <a href="https://www.eia.gov/todayinenergy/detail.php?id=61002" target="_blank" rel="noopener" style={{color:TEXT_DIM,textDecoration:"underline"}}>EIA World Oil Transit Chokepoints</a>, <a href="https://www.iea.org/reports/oil-market-report-march-2026" target="_blank" rel="noopener" style={{color:TEXT_DIM,textDecoration:"underline"}}>IEA Oil Market Report, March 2026</a>, and <a href="https://www.dallasfed.org/research/economics/2026/0320" target="_blank" rel="noopener" style={{color:TEXT_DIM,textDecoration:"underline"}}>Federal Reserve Bank of Dallas (2026)</a>
              <br />
              Historical oil shocks: <a href="https://www.nber.org/papers/w16790" target="_blank" rel="noopener" style={{color:TEXT_DIM,textDecoration:"underline"}}>Hamilton, J.D. (2011), "Historical Oil Shocks," NBER Working Paper 16790</a>
              <br />
              2026 conflict analysis: <a href="https://www.congress.gov/crs-product/R45281" target="_blank" rel="noopener" style={{color:TEXT_DIM,textDecoration:"underline"}}>Congressional Research Service, R45281</a> and <a href="https://unctad.org/publication/strait-hormuz-disruptions-implications-global-trade-and-development" target="_blank" rel="noopener" style={{color:TEXT_DIM,textDecoration:"underline"}}>UNCTAD Strait of Hormuz Disruptions Brief (2026)</a>
              <br />
              Consumer spending research: <a href="https://www.aeaweb.org/articles?id=10.1257/mac.20210024" target="_blank" rel="noopener" style={{color:TEXT_DIM,textDecoration:"underline"}}>Gelman et al. (2023), "Consumer Spending and Gasoline Prices," AEJ: Macroeconomics 15(2)</a>
              <br />
              Inflation pass-through: <a href="https://www.dallasfed.org/~/media/documents/research/papers/2023/wp2312.pdf" target="_blank" rel="noopener" style={{color:TEXT_DIM,textDecoration:"underline"}}>Kilian &amp; Zhou (2023), "Oil Price Shocks and Inflation," Dallas Fed WP 2312</a>
              <br />
              Household gasoline spending: <a href="https://www.eia.gov/outlooks/steo/report/perspectives/2023/04-gasolineprice/article.php" target="_blank" rel="noopener" style={{color:TEXT_DIM,textDecoration:"underline"}}>EIA STEO Household Gasoline Cost Perspectives (2023)</a> and <a href="https://www.bls.gov/opub/reports/consumer-expenditures/2023/" target="_blank" rel="noopener" style={{color:TEXT_DIM,textDecoration:"underline"}}>BLS Consumer Expenditure Survey (2023)</a>
              <br />
              Conflict timelines: <a href="https://www.congress.gov/crs-product/RS21405" target="_blank" rel="noopener" style={{color:TEXT_DIM,textDecoration:"underline"}}>Congressional Research Service, RS21405</a>
            </div>
            <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
              Built with React, D3.js, and Chart.js · Mukund Ummadisetti · 2026
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ── EXPLORER MODE ──
  // Dashboard layout: persistent controls at top, everything visible at once
  const cfl = activeConflict || CONFLICTS[CONFLICTS.length - 1];
  const stData = userState ? STATE_DATA[userState] : null;

  // Quick stats for the selected conflict
  const exDuring = NATIONAL_MONTHLY.filter(d => d.date >= cfl.start && d.date <= cfl.end).map(d => d.price);
  const exPreDate = parseDate(cfl.start); exPreDate.setMonth(exPreDate.getMonth() - 6);
  const exPreStr = `${exPreDate.getFullYear()}-${String(exPreDate.getMonth()+1).padStart(2,"0")}`;
  const exPre = NATIONAL_MONTHLY.filter(d => d.date >= exPreStr && d.date < cfl.start).map(d => d.price);
  const exPreAvg = exPre.length ? _.mean(exPre) : 2.5;
  const exPeakNat = exDuring.length ? _.max(exDuring) : 3.5;
  const exPctChange = exPreAvg > 0 ? ((exPeakNat - exPreAvg) / exPreAvg * 100) : 0;
  const exStatePeak = stData ? exPeakNat + stData.offset : null;
  const exStateExtra = stData ? (exPeakNat + stData.offset - (exPreAvg + stData.offset)) * 1200 : null;

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: FONT, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── Sticky control bar ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: `${BG}f0`, backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${BORDER}`,
        padding: mobile ? "10px 16px" : "10px 24px",
      }}>
        {/* Top row: title + back */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontFamily: DISPLAY_FONT, fontSize: 18, fontWeight: 700, color: TEXT_BRIGHT, margin: 0 }}>
              The Price of Conflict
            </h1>
            <span style={{
              fontSize: 9, padding: "2px 7px", borderRadius: 4,
              background: `${ACCENT}20`, color: ACCENT, fontWeight: 600,
              letterSpacing: 1, textTransform: "uppercase",
            }}>
              Explorer
            </span>
          </div>
          <button
            onClick={() => { setMode("story"); window.scrollTo(0, 0); }}
            style={{
              padding: "6px 14px", fontSize: 11, fontWeight: 600, fontFamily: FONT,
              background: "transparent", color: TEXT_DIM, border: `1px solid ${BORDER}`,
              borderRadius: 6, cursor: "pointer", transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.target.style.color = TEXT_BRIGHT; e.target.style.borderColor = TEXT_DIM; }}
            onMouseLeave={e => { e.target.style.color = TEXT_DIM; e.target.style.borderColor = BORDER; }}
          >
            Back to Story
          </button>
        </div>

        {/* Control row: conflict pills + state selector */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1, alignItems: "center" }}>
            {CONFLICTS.map(c => (
              <button
                key={c.id}
                onClick={() => handleConflictChange(c)}
                style={{
                  padding: "5px 12px", borderRadius: 6, border: `1px solid ${cfl.id === c.id ? c.color : BORDER}`,
                  background: cfl.id === c.id ? `${c.color}18` : "transparent",
                  color: cfl.id === c.id ? c.color : TEXT_DIM, fontSize: 11, fontWeight: 600,
                  cursor: "pointer", fontFamily: FONT, transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {c.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setForecastPanelOpen((o) => !o)}
              style={{
                padding: "5px 14px", borderRadius: 6, border: `1px solid ${forecastPanelOpen ? ACCENT : BORDER}`,
                background: forecastPanelOpen ? `${ACCENT}18` : "transparent",
                color: forecastPanelOpen ? ACCENT : TEXT_DIM, fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: FONT, transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              Forecast
            </button>
          </div>
          <div style={{ width: mobile ? "100%" : 220, flexShrink: 0 }}>
            <StateSelector value={userState} onChange={setUserState} />
          </div>
        </div>
      </header>

      {/* ── Dashboard body ── */}
      <div style={{ flex: 1, padding: mobile ? "16px" : "20px 24px", maxWidth: 1280, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>

        {/* Row 1: Conflict context + key stats */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 320px", gap: 16, marginBottom: 16 }}>
          {/* Conflict detail */}
          <div style={{
            background: `${cfl.color}06`, border: `1px solid ${cfl.color}25`,
            borderRadius: 14, padding: "16px 20px",
            display: "flex", flexDirection: "column", justifyContent: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfl.color }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: TEXT_BRIGHT, fontFamily: DISPLAY_FONT }}>
                {cfl.name}
              </span>
              <span style={{ fontSize: 11, color: TEXT_DIM }}>
                {cfl.region} · {fmtDate(cfl.start)} to {fmtDate(cfl.end)}
              </span>
            </div>
            <p style={{ fontSize: 12, color: TEXT_DIM, lineHeight: 1.55, margin: 0 }}>
              {cfl.detail}
            </p>
          </div>

          {/* Key metrics */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1,
            background: BORDER, borderRadius: 14, overflow: "hidden",
          }}>
            {[
              { label: "Pre-conflict avg", value: fmtPrice(exPreAvg), color: TEXT_BRIGHT },
              { label: "Peak during", value: fmtPrice(exPeakNat), color: ACCENT },
              { label: "Price change", value: `+${exPctChange.toFixed(1)}%`, color: ACCENT_WARM },
              { label: stData ? `${stData.name} peak` : "Select a state", value: exStatePeak ? fmtPrice(exStatePeak) : "--", color: stData ? cfl.color : TEXT_DIM },
            ].map((s, i) => (
              <div key={i} style={{ background: BG_CARD, padding: "14px 16px" }}>
                <div style={{ fontSize: 9, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: DISPLAY_FONT, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2: Main chart */}
        <div style={{
          background: BG_CARD, borderRadius: 14, padding: mobile ? 16 : 20,
          border: `1px solid ${BORDER}`, marginBottom: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_BRIGHT }}>National Gas Price</span>
              <span style={{ fontSize: 11, color: TEXT_DIM, marginLeft: 8 }}>Regular grade, $/gal · EIA</span>
            </div>
          </div>
          <PriceChart highlightConflict={cfl} showAllConflicts={true} />
        </div>

        {/* Row 3: Three-panel grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr",
          gap: 16, marginBottom: 16,
        }}>
          {/* Panel A: Regional comparison */}
          <div style={{
            background: BG_CARD, borderRadius: 14, padding: 18,
            border: `1px solid ${BORDER}`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_BRIGHT, marginBottom: 2 }}>Regional Prices</div>
            <div style={{ fontSize: 10, color: TEXT_DIM, marginBottom: 12 }}>PADD districts during conflict</div>
            <RegionChart conflictId={cfl.id} />
          </div>

          {/* Panel B: Import sources */}
          <div style={{
            background: BG_CARD, borderRadius: 14, padding: 18,
            border: `1px solid ${BORDER}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_BRIGHT, marginBottom: 2 }}>Import Sources</div>
                <div style={{ fontSize: 10, color: TEXT_DIM }}>U.S. crude by country, {importYear}</div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {Object.keys(IMPORT_SOURCES_TIMELINE).map(yr => (
                  <button
                    key={yr}
                    onClick={() => setImportYear(yr)}
                    style={{
                      padding: "3px 8px", borderRadius: 4, border: "none",
                      background: importYear === yr ? `${ACCENT}25` : "transparent",
                      color: importYear === yr ? ACCENT : TEXT_DIM, fontSize: 10, fontWeight: 600,
                      cursor: "pointer", fontFamily: FONT,
                    }}
                  >
                    {yr.slice(2)}
                  </button>
                ))}
              </div>
            </div>
            <ImportDonut year={importYear} />
          </div>

          {/* Panel C: Price impact bars */}
          <div style={{
            background: BG_CARD, borderRadius: 14, padding: 18,
            border: `1px solid ${BORDER}`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_BRIGHT, marginBottom: 2 }}>Price Impact</div>
            <div style={{ fontSize: 10, color: TEXT_DIM, marginBottom: 12 }}>Change by region during {cfl.name}</div>
            <VolatilityBars conflictId={cfl.id} />
          </div>
        </div>

        {/* Row 4: State detail (only if state selected) */}
        {userState && stData && (
          <div style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
            gap: 16, marginBottom: 16,
          }}>
            <LocalInsights stateCode={userState} conflict={cfl} />
            <PocketImpact stateCode={userState} conflict={cfl} />
          </div>
        )}

        {/* Scenario forecast panel (collapsible) */}
        <div style={{
          overflow: "hidden",
          maxHeight: forecastPanelOpen ? 8000 : 0,
          opacity: forecastPanelOpen ? 1 : 0,
          transition: "max-height 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease",
          marginBottom: forecastPanelOpen ? 16 : 0,
        }}>
          <div style={{
            background: BG_CARD, borderRadius: 14, padding: mobile ? 16 : 22,
            border: `1px solid ${BORDER}`, marginTop: 8,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_BRIGHT, marginBottom: 4, fontFamily: DISPLAY_FONT }}>
              Scenario Forecast Simulator
            </div>
            <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 16 }}>
              Uses the same engine as Story mode. State selection above applies to regional adjustments.
            </div>
            <ScenarioInput onSubmit={handleForecastSubmit} mobile={mobile} />
            {forecastError === "noMatch" && (
              <div style={{
                marginTop: 16, padding: 14, borderRadius: 12, background: BG,
                borderWidth: 1, borderStyle: "solid", borderColor: "#f59e0b", color: TEXT_DIM, fontSize: 13, lineHeight: 1.5,
              }}>
                I couldn&apos;t identify a specific event type from your description. Try mentioning a type of event (war, sanctions, hurricane, recession) and a timeframe.
              </div>
            )}
            {forecastError === "past" && (
              <div style={{
                marginTop: 16, padding: 14, borderRadius: 12, background: BG,
                borderWidth: 1, borderStyle: "solid", borderColor: "#f59e0b", color: TEXT_DIM, fontSize: 13, lineHeight: 1.5,
              }}>
                This event date is in the past. The forecast works for future scenarios. Try a date in 2026 or later.
              </div>
            )}
            {forecastWarning === "farFuture" && forecastResult && (
              <div style={{
                marginTop: 14, padding: 12, borderRadius: 12, background: `${ACCENT}10`,
                border: `1px solid ${ACCENT}35`, color: TEXT_DIM, fontSize: 12, lineHeight: 1.5,
              }}>
                Forecasts beyond 2035 have very high uncertainty. Showing results but note the wide confidence band.
              </div>
            )}
            {forecastResult && (
              <>
                <ForecastChart forecast={forecastResult} mobile={mobile} />
                <ForecastResults forecast={forecastResult} classification={forecastResult.classification} mobile={mobile} />
              </>
            )}
          </div>
        </div>

        {/* Minimal footer */}
        <div style={{ padding: "16px 0", borderTop: `1px solid ${BORDER}`, fontSize: 10, color: TEXT_DIM }}>
          Sources: EIA · Tax Foundation · NBER · IEA · CRS · Dallas Fed ·
          Built with React, D3.js, Chart.js · Mukund Ummadisetti · 2026
        </div>
      </div>
    </div>
  );
}
