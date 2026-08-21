/* ------------------------------------------------------------------ */
/* SINGLE SOURCE OF TRUTH for plans, usage tiers, and pricing.          */
/* Edit values here when pricing changes — nothing else needs to change.*/
/* ------------------------------------------------------------------ */

export const IMPACT_PLANS = [
  {
    id: "core",
    name: "Impact Core",
    tagline: "You run it. We equip you.",
    price: 800,
    credits: "10 Annual Credits",
    calls: "5 concurrent calls",
    popular: false,
    topFeatures: ["Customer-built agents", "24-hr response SLA"],
    allFeatures: [
      "Customer-built agents using SalesAi tools",
      "24-hour response SLA",
      "Platform access + Help Center resources",
      "As-needed performance reviews (credit-based)",
      "5 concurrent calls",
    ],
  },
  {
    id: "advised",
    name: "Impact Advised",
    tagline: "Shared ownership. Expert guidance.",
    price: 1600,
    credits: "40 Annual Credits",
    calls: "10 concurrent calls",
    popular: true,
    topFeatures: ["Up to 3 agents managed", "12-hr priority SLA"],
    allFeatures: [
      "Up to 3 agents built & managed by SalesAi",
      "Impact Manager accountable to your outcomes",
      "12-hour priority support SLA",
      "Quarterly performance reviews + optimization",
      "10 concurrent calls",
    ],
  },
  {
    id: "managed",
    name: "Impact Managed",
    tagline: "We run it. You realize results.",
    price: 2600,
    credits: "Unlimited Credits",
    calls: "15 concurrent calls",
    popular: false,
    topFeatures: ["Unlimited agents managed", "2-hr priority SLA"],
    allFeatures: [
      "Unlimited agents built & managed by SalesAi",
      "Named Impact Manager + proactive monthly optimization",
      "2-hour priority support SLA",
      "Unlimited change requests, no tickets",
      "15 concurrent calls",
    ],
  },
];

export const VOICE_OPTIONS = [
  { id: "v0", label: "No Voice", detail: "Minutes / Month", price: 0, custom: false, dials: null },
  { id: "v2000", label: "2,000", detail: "Minutes / Month", price: 400, custom: false, dials: "About 1,000 dials*" },
  { id: "v5000", label: "5,000", detail: "Minutes / Month", price: 800, custom: false, dials: "About 2,500 dials*" },
  { id: "v10000", label: "10,000", detail: "Minutes / Month", price: 1600, custom: false, dials: "About 5,000 dials*" },
  { id: "vcustom", label: "10,000+", detail: "Minutes / Month", price: null, custom: true, dials: "About 5,000+ dials*" },
];

export const SMS_OPTIONS = [
  { id: "s0", label: "No SMS", detail: "Texts / Month", price: 0, custom: false },
  { id: "s5000", label: "5,000", detail: "Texts / Month", price: 150, custom: false },
  { id: "s10000", label: "10,000", detail: "Texts / Month", price: 250, custom: false },
  { id: "s25000", label: "25,000", detail: "Texts / Month", price: 500, custom: false },
  { id: "scustom", label: "25,000+", detail: "Texts / Month", price: null, custom: true },
];

export const DEFAULTS = { plan: "advised", voice: "v5000", sms: "s10000" };

export const fmt = (n) => `$${n.toLocaleString("en-US")}`;

/* ------------------------------------------------------------------ */
/* Whitelist validators.                                                */
/* Any value coming from a URL (or anywhere outside app state) MUST     */
/* pass through these before being trusted. They only ever return an    */
/* id that exists in the arrays above, or null.                         */
/* ------------------------------------------------------------------ */

export function isValidPlanId(id) {
  return IMPACT_PLANS.some((p) => p.id === id) ? id : null;
}
export function isValidVoiceId(id) {
  return VOICE_OPTIONS.some((v) => v.id === id) ? id : null;
}
export function isValidSmsId(id) {
  return SMS_OPTIONS.some((s) => s.id === id) ? id : null;
}

export function getPlan(id) {
  return IMPACT_PLANS.find((p) => p.id === id) || IMPACT_PLANS.find((p) => p.id === DEFAULTS.plan);
}
export function getVoice(id) {
  return VOICE_OPTIONS.find((v) => v.id === id) || VOICE_OPTIONS.find((v) => v.id === DEFAULTS.voice);
}
export function getSms(id) {
  return SMS_OPTIONS.find((s) => s.id === id) || SMS_OPTIONS.find((s) => s.id === DEFAULTS.sms);
}
