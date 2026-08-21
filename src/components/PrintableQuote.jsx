import React from "react";
import { fmt } from "../data/pricingData.js";

/* ------------------------------------------------------------------ */
/* This is the ONLY thing captured for PDF/PNG export. It is rendered   */
/* off-screen (see App.jsx) and contains no drag handles, no selection  */
/* controls, no Reset button, no local-storage messaging — just a clean */
/* customer-facing quote.                                               */
/* ------------------------------------------------------------------ */

const PrintableQuote = React.forwardRef(function PrintableQuote(
  { plan, voice, sms, total, isCustom, company, contact, quoteDate },
  ref
) {
  return (
    <div
      ref={ref}
      style={{
        width: 800,
        padding: 48,
        background: "#0a0c0e",
        color: "#f4f6f7",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif",
      }}
    >
      {/* Brand header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#34e37a", boxShadow: "0 0 12px #34e37a" }} />
        <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "0.06em", color: "#34e37a", textTransform: "uppercase" }}>
          SalesAi
        </div>
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "4px 0 2px" }}>Your SalesAi Package Quote</h1>
      <p style={{ color: "#9aa4ab", fontSize: 13, margin: "0 0 26px" }}>{quoteDate}</p>

      {/* Prospect info, only if entered */}
      {(company || contact) && (
        <div style={{ background: "#131619", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 18px", marginBottom: 24 }}>
          {company && <div style={{ fontSize: 15, fontWeight: 700 }}>{company}</div>}
          {contact && <div style={{ fontSize: 13, color: "#9aa4ab", marginTop: 2 }}>{contact}</div>}
        </div>
      )}

      {/* Line items */}
      <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, overflow: "hidden", marginBottom: 22 }}>
        <QuoteRow label={plan.name} sub={plan.tagline} price={plan.price} />
        <QuoteRow
          label={voice.label === "No Voice" ? "No Voice" : `Voice — ${voice.label} minutes / month`}
          sub={voice.dials || undefined}
          price={voice.price}
          custom={voice.custom}
        />
        <QuoteRow
          label={sms.label === "No SMS" ? "No SMS" : `SMS — ${sms.label} texts / month`}
          price={sms.price}
          custom={sms.custom}
          last
        />
      </div>

      {/* Total */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          background: "rgba(52,227,122,0.08)",
          border: "1px solid rgba(52,227,122,0.4)",
          borderRadius: 14,
          padding: "18px 22px",
          marginBottom: 26,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700 }}>Complete Monthly Price</span>
        {isCustom ? (
          <span style={{ fontSize: 20, fontWeight: 900, color: "#34e37a" }}>Custom — contact SalesAi</span>
        ) : (
          <span style={{ fontSize: 34, fontWeight: 900, color: "#34e37a" }}>
            {fmt(total)}
            <span style={{ fontSize: 14, color: "#9aa4ab", fontWeight: 600, marginLeft: 4 }}>/month</span>
          </span>
        )}
      </div>

      {/* Disclaimers */}
      <p style={{ fontSize: 11, lineHeight: 1.5, color: "#6c757b", margin: "0 0 6px" }}>
        *Estimated dial volume is based on an average call duration of two minutes. Actual dial volume may vary based
        on call length.
      </p>
      <p style={{ fontSize: 11, lineHeight: 1.5, color: "#6c757b", margin: 0 }}>Pricing subject to final agreement.</p>
    </div>
  );
});

function QuoteRow({ label, sub, price, custom, last }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 18px",
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.08)",
        background: "#131619",
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: "#9aa4ab", marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: custom ? "#34e37a" : "#f4f6f7" }}>
        {custom ? "Custom" : fmt(price)}
      </div>
    </div>
  );
}

export default PrintableQuote;
