import { isValidPlanId, isValidVoiceId, isValidSmsId, DEFAULTS } from "../data/pricingData.js";

/* ------------------------------------------------------------------ */
/* Internal shareable links.                                            */
/*                                                                       */
/* The URL only ever carries three short selection IDs (e.g. "advised", */
/* "v5000", "s10000") — the same IDs used internally to look up plan/    */
/* voice/SMS records. It never carries a dollar amount. On load, every  */
/* value is checked against the whitelist in pricingData.js; anything   */
/* that isn't a recognized ID is discarded and the default is used      */
/* instead. This means a URL can never be edited to produce a price     */
/* that doesn't come from the app's own pricing table.                  */
/* ------------------------------------------------------------------ */

export function buildShareUrl({ planId, voiceId, smsId }) {
  const url = new URL(window.location.href);
  url.search = ""; // start clean, don't carry over anything unexpected
  url.searchParams.set("plan", planId);
  url.searchParams.set("voice", voiceId);
  url.searchParams.set("sms", smsId);
  return url.toString();
}

export function parseShareParams(search = window.location.search) {
  const params = new URLSearchParams(search);

  const planParam = params.get("plan");
  const voiceParam = params.get("voice");
  const smsParam = params.get("sms");

  return {
    planId: isValidPlanId(planParam) || DEFAULTS.plan,
    voiceId: isValidVoiceId(voiceParam) || DEFAULTS.voice,
    smsId: isValidSmsId(smsParam) || DEFAULTS.sms,
    // True only if every param present in the URL was actually valid —
    // used purely to decide whether to show a subtle "loaded from link" hint.
    wasValidLink: Boolean(planParam || voiceParam || smsParam) &&
      isValidPlanId(planParam) !== null &&
      isValidVoiceId(voiceParam) !== null &&
      isValidSmsId(smsParam) !== null,
  };
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
