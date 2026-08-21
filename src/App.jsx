import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  GripVertical, Check, X, RotateCcw, ArrowRight, Info,
  Save, FolderOpen, Link2, FileText, Image as ImageIcon, Copy, Trash2, Pencil,
} from "lucide-react";
import { IMPACT_PLANS, VOICE_OPTIONS, SMS_OPTIONS, DEFAULTS, fmt, getPlan, getVoice, getSms } from "./data/pricingData.js";
import { listSavedQuotes, saveQuote, duplicateQuote, renameQuote, deleteQuote, clearAllQuotes } from "./lib/storage.js";
import { buildShareUrl, parseShareParams, copyToClipboard } from "./lib/share.js";
import { downloadQuoteAsPdf, downloadQuoteAsPng } from "./lib/exportQuote.js";
import PrintableQuote from "./components/PrintableQuote.jsx";

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

function PriceTag({ price, custom, size = "md" }) {
  if (custom) return <span className={`price price-${size} price-custom`}>Custom</span>;
  return (
    <span className={`price price-${size}`}>
      {fmt(price)}
      <span className="price-per">/mo</span>
    </span>
  );
}

function DraggablePricingCard({ kind, item, selected, dragging, onSelect, onDragStart, onDragEnd, children }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(item.id);
    }
  };
  return (
    <div
      className={["card", `card-${kind}`, selected ? "card-selected" : "", dragging ? "card-dragging" : ""].join(" ").trim()}
      draggable
      onDragStart={(e) => onDragStart(e, kind, item.id)}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(item.id)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={`${item.label || item.name}${selected ? ", selected" : ""}`}
    >
      <div className="card-draghandle" aria-hidden="true"><GripVertical size={13} /></div>
      {selected && <div className="card-selected-badge" aria-hidden="true"><Check size={11} /></div>}
      {children}
    </div>
  );
}

function PlanCardBody({ plan, infoOpen, onToggleInfo }) {
  return (
    <>
      <div className="plan-top-row">
        {plan.popular ? <div className="plan-popular">Most Popular</div> : <span />}
        <button
          type="button"
          className="info-btn"
          onClick={(e) => { e.stopPropagation(); onToggleInfo(plan.id); }}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label={`View full details for ${plan.name}`}
          aria-expanded={infoOpen}
        >
          <Info size={13} />
        </button>
      </div>
      <h3 className="plan-name">{plan.name}</h3>
      <p className="plan-tagline">{plan.tagline}</p>
      <div className="plan-price-row"><PriceTag price={plan.price} size="lg" /></div>
      <div className="plan-stats">
        <span className="plan-stat">{plan.credits}</span>
        <span className="plan-stat">{plan.calls}</span>
      </div>
      <ul className="plan-features">
        {plan.topFeatures.map((f) => (
          <li key={f}><Check size={12} className="feature-check" /><span>{f}</span></li>
        ))}
      </ul>
      {infoOpen && (
        <div className="info-popover" onClick={(e) => e.stopPropagation()}>
          <div className="info-popover-title">{plan.name} — full details</div>
          <ul>
            {plan.allFeatures.map((f) => (
              <li key={f}><Check size={12} className="feature-check" /><span>{f}</span></li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function UsageCardBody({ item }) {
  return (
    <>
      <div className="usage-allowance">{item.label}</div>
      <div className="usage-detail">{item.detail}</div>
      <div className="usage-price-row"><PriceTag price={item.price} custom={item.custom} size="md" /></div>
      {item.dials && <div className="usage-dials">{item.dials}</div>}
    </>
  );
}

function InfoBadge({ tooltip, open, onToggle, onOpen, onClose }) {
  return (
    <div className="info-badge-wrap" onMouseEnter={onOpen} onMouseLeave={onClose}>
      <button
        type="button"
        className="info-badge"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        onKeyDown={(e) => e.stopPropagation()}
        aria-expanded={open}
        aria-label="Estimated dial volume based on a 2-minute average call. More info."
      >
        <Info size={10} />
        <span className="info-badge-full">Estimated dial volume based on a 2-minute average call</span>
        <span className="info-badge-short">Estimates based on a 2-minute average call</span>
      </button>
      {open && (
        <div className="badge-tooltip" onClick={(e) => e.stopPropagation()} role="tooltip">
          {tooltip}
        </div>
      )}
    </div>
  );
}

function QuoteDropZone({ label, required, kind, filled, hoverValid, onDragOver, onDragLeave, onDrop, onRemove }) {
  return (
    <div
      className={["dropzone", filled ? "dropzone-filled" : "", hoverValid ? "dropzone-hover" : ""].join(" ").trim()}
      onDragOver={(e) => onDragOver(e, kind)}
      onDragLeave={() => onDragLeave(kind)}
      onDrop={(e) => onDrop(e, kind)}
    >
      <div className="dropzone-label">
        {label}
        <span className={required ? "dropzone-required" : "dropzone-optional"}>{required ? "Required" : "Optional"}</span>
      </div>
      {filled ? (
        <div className="dropzone-content">
          <div className="dropzone-item">
            <div className="dropzone-item-name">{filled.name}</div>
            {filled.subtext && <div className="dropzone-item-sub">{filled.subtext}</div>}
            <PriceTag price={filled.price} custom={filled.custom} size="sm" />
          </div>
          {!required && (
            <button className="dropzone-remove" onClick={() => onRemove(kind)} aria-label={`Remove ${label} selection`}>
              <X size={12} />
            </button>
          )}
          {required && <span className="dropzone-change">Change ↑</span>}
        </div>
      ) : (
        <div className="dropzone-empty">Drag here</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toolbar — Save Locally / My Saved Quotes / Copy Link / PDF / PNG     */
/* ------------------------------------------------------------------ */

function Toolbar({ onSave, onOpenQuotes, onCopyLink, onPdf, onPng, busy }) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Quote actions">
      <button className="tb-btn" onClick={onSave} title="Save Locally" aria-label="Save Locally">
        <Save size={14} />
      </button>
      <button className="tb-btn" onClick={onOpenQuotes} title="Saved on this device" aria-label="Open saved quotes">
        <FolderOpen size={14} />
      </button>
      <button className="tb-btn" onClick={onCopyLink} title="Copy Internal Link" aria-label="Copy internal link">
        <Link2 size={14} />
      </button>
      <button className="tb-btn" onClick={onPdf} disabled={busy === "pdf"} title="Download PDF" aria-label="Download PDF">
        <FileText size={14} />
      </button>
      <button className="tb-btn" onClick={onPng} disabled={busy === "png"} title="Download PNG" aria-label="Download PNG">
        <ImageIcon size={14} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Save Locally modal                                                   */
/* ------------------------------------------------------------------ */

function SaveModal({ company, contact, notes, onChange, onSave, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Saved on this device</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <p className="modal-note">
          Locally saved quotes are available only in this browser and are not shared across the SalesAi team.
        </p>
        <label className="field-label">Prospect company</label>
        <input className="field-input" value={company} onChange={(e) => onChange({ company: e.target.value })} placeholder="Acme Corp" />
        <label className="field-label">Prospect contact</label>
        <input className="field-input" value={contact} onChange={(e) => onChange({ contact: e.target.value })} placeholder="Jane Doe, VP Sales" />
        <label className="field-label">Notes (optional)</label>
        <textarea className="field-input field-textarea" value={notes} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Internal notes about this quote..." />
        <div className="modal-actions">
          <button className="modal-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="modal-btn-primary" onClick={onSave}>Save Locally</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* My Saved Quotes modal                                                */
/* ------------------------------------------------------------------ */

function QuotesModal({ quotes, onOpen, onDuplicate, onRename, onDelete, onClearAll, onClose }) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Saved on this device</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <p className="modal-note">
          Locally saved quotes are available only in this browser and are not shared across the SalesAi team.
        </p>

        {quotes.length === 0 ? (
          <p className="quotes-empty">No quotes saved on this device yet.</p>
        ) : (
          <div className="quotes-list">
            {quotes.map((q) => {
              const plan = getPlan(q.planId);
              const voice = getVoice(q.voiceId);
              const sms = getSms(q.smsId);
              return (
                <div key={q.id} className="quote-row">
                  <div className="quote-row-main">
                    {renamingId === q.id ? (
                      <input
                        className="field-input rename-input"
                        value={renameValue}
                        autoFocus
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { onRename(q.id, renameValue); setRenamingId(null); }
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                      />
                    ) : (
                      <div className="quote-row-name">{q.name}</div>
                    )}
                    <div className="quote-row-detail">
                      {plan.name} · {voice.label === "No Voice" ? "No Voice" : `${voice.label} min`} · {sms.label === "No SMS" ? "No SMS" : `${sms.label} texts`}
                    </div>
                    <div className="quote-row-date">Saved {new Date(q.updatedAt).toLocaleDateString()}</div>
                  </div>
                  <div className="quote-row-actions">
                    <button className="qr-btn" onClick={() => onOpen(q)} title="Open">Open</button>
                    <button className="qr-icon" onClick={() => onDuplicate(q.id)} title="Duplicate"><Copy size={13} /></button>
                    <button
                      className="qr-icon"
                      onClick={() => { setRenamingId(q.id); setRenameValue(q.name); }}
                      title="Rename"
                    >
                      <Pencil size={13} />
                    </button>
                    <button className="qr-icon qr-danger" onClick={() => onDelete(q.id)} title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="modal-actions">
          <button className="modal-btn-secondary" onClick={onClearAll} disabled={quotes.length === 0}>
            Clear All Locally Saved Quotes
          </button>
          <button className="modal-btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main App                                                             */
/* ------------------------------------------------------------------ */

export default function App() {
  const initial = parseShareParams();

  const [planId, setPlanId] = useState(initial.planId);
  const [voiceId, setVoiceId] = useState(initial.voiceId);
  const [smsId, setSmsId] = useState(initial.smsId);

  const [draggingKind, setDraggingKind] = useState(null);
  const [hoverZone, setHoverZone] = useState(null);
  const [infoOpenId, setInfoOpenId] = useState(null);
  const [pulseTotal, setPulseTotal] = useState(false);
  const pulseTimer = useRef(null);

  const [prospect, setProspect] = useState({ company: "", contact: "", notes: "" });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showQuotesModal, setShowQuotesModal] = useState(false);
  const [savedQuotes, setSavedQuotes] = useState([]);
  const [toast, setToast] = useState(null);
  const [exportBusy, setExportBusy] = useState(null);
  const toastTimer = useRef(null);
  const printableRef = useRef(null);

  const plan = getPlan(planId);
  const voice = getVoice(voiceId);
  const sms = getSms(smsId);
  const anyCustom = voice.custom || sms.custom;
  const total = anyCustom ? null : plan.price + voice.price + sms.price;

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    if (initial.wasValidLink) showToast("Loaded selections from shared link");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerPulse = useCallback(() => {
    setPulseTotal(true);
    clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => setPulseTotal(false), 420);
  }, []);

  /* ---------------- drag handlers ---------------- */

  const handleDragStart = useCallback((e, kind, id) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData(`application/x-${kind}`, id);
    e.dataTransfer.setData("text/plain", id);
    setDraggingKind(kind);
  }, []);
  const handleDragEnd = useCallback(() => { setDraggingKind(null); setHoverZone(null); }, []);
  const handleZoneDragOver = useCallback((e, zoneKind) => {
    if (e.dataTransfer.types.includes(`application/x-${zoneKind}`)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setHoverZone(zoneKind);
    }
  }, []);
  const handleZoneDragLeave = useCallback((zoneKind) => {
    setHoverZone((z) => (z === zoneKind ? null : z));
  }, []);
  const handleZoneDrop = useCallback((e, zoneKind) => {
    e.preventDefault();
    const id = e.dataTransfer.getData(`application/x-${zoneKind}`);
    if (!id) return;
    if (zoneKind === "plan") setPlanId(id);
    if (zoneKind === "voice") setVoiceId(id);
    if (zoneKind === "sms") setSmsId(id);
    setDraggingKind(null);
    setHoverZone(null);
    triggerPulse();
  }, [triggerPulse]);

  const selectPlan = useCallback((id) => { setPlanId(id); triggerPulse(); }, [triggerPulse]);
  const selectVoice = useCallback((id) => { setVoiceId(id); triggerPulse(); }, [triggerPulse]);
  const selectSms = useCallback((id) => { setSmsId(id); triggerPulse(); }, [triggerPulse]);
  const removeVoice = useCallback(() => { setVoiceId("v0"); triggerPulse(); }, [triggerPulse]);
  const removeSms = useCallback(() => { setSmsId("s0"); triggerPulse(); }, [triggerPulse]);
  const resetQuote = useCallback(() => {
    setPlanId(DEFAULTS.plan); setVoiceId(DEFAULTS.voice); setSmsId(DEFAULTS.sms); triggerPulse();
  }, [triggerPulse]);
  const toggleInfo = useCallback((id) => setInfoOpenId((cur) => (cur === id ? null : id)), []);

  /* ---------------- toolbar actions ---------------- */

  const handleSaveLocally = useCallback(() => {
    const saved = saveQuote({ ...prospect, planId, voiceId, smsId });
    if (saved) {
      showToast("Saved on this device");
      setShowSaveModal(false);
    } else {
      showToast("Couldn't save — storage may be full or unavailable");
    }
  }, [prospect, planId, voiceId, smsId, showToast]);

  const openQuotesModal = useCallback(() => {
    setSavedQuotes(listSavedQuotes());
    setShowQuotesModal(true);
  }, []);

  const handleOpenSavedQuote = useCallback((q) => {
    setPlanId(q.planId);
    setVoiceId(q.voiceId);
    setSmsId(q.smsId);
    setProspect({ company: q.company || "", contact: q.contact || "", notes: q.notes || "" });
    setShowQuotesModal(false);
    triggerPulse();
    showToast(`Loaded "${q.name}"`);
  }, [triggerPulse, showToast]);

  const handleDuplicateQuote = useCallback((id) => {
    duplicateQuote(id);
    setSavedQuotes(listSavedQuotes());
  }, []);
  const handleRenameQuote = useCallback((id, name) => {
    renameQuote(id, name);
    setSavedQuotes(listSavedQuotes());
  }, []);
  const handleDeleteQuote = useCallback((id) => {
    deleteQuote(id);
    setSavedQuotes(listSavedQuotes());
  }, []);
  const handleClearAll = useCallback(() => {
    if (window.confirm("Clear all locally saved quotes on this device? This cannot be undone.")) {
      clearAllQuotes();
      setSavedQuotes([]);
    }
  }, []);

  const handleCopyLink = useCallback(async () => {
    const url = buildShareUrl({ planId, voiceId, smsId });
    const ok = await copyToClipboard(url);
    showToast(ok ? "Internal link copied (selections only)" : "Couldn't copy — copy manually from the address bar");
  }, [planId, voiceId, smsId, showToast]);

  const handleDownloadPdf = useCallback(async () => {
    if (!printableRef.current) return;
    setExportBusy("pdf");
    try {
      await downloadQuoteAsPdf(printableRef.current, `salesai-quote-${plan.id}.pdf`);
    } finally {
      setExportBusy(null);
    }
  }, [plan.id]);

  const handleDownloadPng = useCallback(async () => {
    if (!printableRef.current) return;
    setExportBusy("png");
    try {
      await downloadQuoteAsPng(printableRef.current, `salesai-quote-${plan.id}.png`);
    } finally {
      setExportBusy(null);
    }
  }, [plan.id]);

  return (
    <div className="sai-root" onClick={() => setInfoOpenId(null)}>
      <GlobalStyles />

      {/* HEADER */}
      <header className="sai-header">
        <div className="sai-header-left">
          <div className="sai-logo"><span className="sai-logo-dot" />SalesAi</div>
          <h1 className="sai-headline">Build the package that fits your business.</h1>
        </div>
        <div className="sai-equation">
          <span className="sai-eq-part">IMPACT PLAN</span>
          <span className="sai-eq-op">+</span>
          <span className="sai-eq-part">VOICE AND/OR SMS</span>
          <span className="sai-eq-op">=</span>
          <span className="sai-eq-part total">TOTAL MONTHLY PRICE</span>
        </div>
        <Toolbar
          busy={exportBusy}
          onSave={() => setShowSaveModal(true)}
          onOpenQuotes={openQuotesModal}
          onCopyLink={handleCopyLink}
          onPdf={handleDownloadPdf}
          onPng={handleDownloadPng}
        />
      </header>

      {/* SELECTION AREA */}
      <div className="sai-selection">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Choose Your Impact Plan</h2>
            <p className="panel-note">Requires one plan</p>
          </div>
          <div className="plan-list">
            {IMPACT_PLANS.map((p) => (
              <DraggablePricingCard
                key={p.id}
                kind="plan"
                item={{ ...p, label: p.name }}
                selected={p.id === planId}
                dragging={draggingKind === "plan"}
                onSelect={selectPlan}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <PlanCardBody plan={p} infoOpen={infoOpenId === p.id} onToggleInfo={toggleInfo} />
              </DraggablePricingCard>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Choose Your Usage</h2>
            <p className="panel-note">Voice, SMS, or both</p>
          </div>

          <div className="usage-subsection voice">
            <div className="usage-subhead-row">
              <div className="usage-subhead">Voice Minutes</div>
              <InfoBadge
                tooltip="Estimated dial volume is calculated using an average of two minutes per dial. Actual dial volume may vary based on dial duration."
                open={infoOpenId === "dialInfo"}
                onToggle={() => toggleInfo("dialInfo")}
                onOpen={() => setInfoOpenId("dialInfo")}
                onClose={() => setInfoOpenId((cur) => (cur === "dialInfo" ? null : cur))}
              />
            </div>
            <div className="usage-grid-wrap">
              <div className="usage-grid">
                {VOICE_OPTIONS.map((v) => (
                  <DraggablePricingCard key={v.id} kind="voice" item={v} selected={v.id === voiceId} dragging={draggingKind === "voice"} onSelect={selectVoice} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <UsageCardBody item={v} />
                  </DraggablePricingCard>
                ))}
              </div>
            </div>
            <p className="voice-footnote">*Estimated using an average call duration of two minutes. Actual dial volume will vary based on call length.</p>
          </div>

          <div className="usage-subsection sms">
            <div className="usage-subhead">SMS Packages</div>
            <div className="usage-grid-wrap">
              <div className="usage-grid">
                {SMS_OPTIONS.map((s) => (
                  <DraggablePricingCard key={s.id} kind="sms" item={s} selected={s.id === smsId} dragging={draggingKind === "sms"} onSelect={selectSms} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <UsageCardBody item={s} />
                  </DraggablePricingCard>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* QUOTE BUILDER */}
      <section className="quote-section">
        <div className="quote-left">
          <div className="quote-title-row">
            <h2 className="quote-title">Build Your Quote</h2>
            <p className="quote-sub">Drag or click to select</p>
          </div>
          <div className="dropzones">
            <QuoteDropZone label="Impact Plan" required kind="plan" filled={{ name: plan.name, price: plan.price, custom: false }} hoverValid={hoverZone === "plan"} onDragOver={handleZoneDragOver} onDragLeave={handleZoneDragLeave} onDrop={handleZoneDrop} onRemove={() => {}} />
            <QuoteDropZone label="Voice Usage" required={false} kind="voice" filled={{ name: voice.label === "No Voice" ? "No Voice" : `${voice.label} minutes`, subtext: voice.dials, price: voice.price, custom: voice.custom }} hoverValid={hoverZone === "voice"} onDragOver={handleZoneDragOver} onDragLeave={handleZoneDragLeave} onDrop={handleZoneDrop} onRemove={removeVoice} />
            <QuoteDropZone label="SMS Usage" required={false} kind="sms" filled={{ name: sms.label === "No SMS" ? "No SMS" : `${sms.label} texts`, price: sms.price, custom: sms.custom }} hoverValid={hoverZone === "sms"} onDragOver={handleZoneDragOver} onDragLeave={handleZoneDragLeave} onDrop={handleZoneDrop} onRemove={removeSms} />
          </div>
        </div>

        <div className="quote-right">
          <div className="summary-title">Your Complete Monthly Price</div>
          <div className="summary-line"><span>{plan.name}</span><span>{fmt(plan.price)}</span></div>
          <div className="summary-line"><span>Voice — {voice.label}</span><span>{voice.custom ? "Custom" : fmt(voice.price)}</span></div>
          <div className="summary-line"><span>SMS — {sms.label}</span><span>{sms.custom ? "Custom" : fmt(sms.price)}</span></div>
          <div className="summary-total-row">
            <span className="summary-total-label">Total</span>
            {anyCustom ? (
              <span className="summary-total-value custom">Custom — contact SalesAi</span>
            ) : (
              <span className={`summary-total-value ${pulseTotal ? "pulse" : ""}`}>{fmt(total)}<span className="summary-total-per">/mo</span></span>
            )}
          </div>
          <div className="quote-footer-row">
            <button className="reset-btn" onClick={resetQuote}><RotateCcw size={12} />Reset</button>
            <button className="cta-btn">Talk to SalesAi<ArrowRight size={13} /></button>
          </div>
        </div>
      </section>

      {/* Off-screen printable quote — captured for PDF/PNG, never shown on screen */}
      <div className="printable-offscreen" aria-hidden="true">
        <PrintableQuote
          ref={printableRef}
          plan={plan}
          voice={voice}
          sms={sms}
          total={total}
          isCustom={anyCustom}
          company={prospect.company}
          contact={prospect.contact}
          quoteDate={new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
        />
      </div>

      {showSaveModal && (
        <SaveModal
          company={prospect.company}
          contact={prospect.contact}
          notes={prospect.notes}
          onChange={(patch) => setProspect((p) => ({ ...p, ...patch }))}
          onSave={handleSaveLocally}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      {showQuotesModal && (
        <QuotesModal
          quotes={savedQuotes}
          onOpen={handleOpenSavedQuote}
          onDuplicate={handleDuplicateQuote}
          onRename={handleRenameQuote}
          onDelete={handleDeleteQuote}
          onClearAll={handleClearAll}
          onClose={() => setShowQuotesModal(false)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                               */
/* ------------------------------------------------------------------ */

function GlobalStyles() {
  return (
    <style>{`
      .sai-root {
        --bg: #0a0c0e; --bg-raise: #131619; --bg-raise-2: #191d21;
        --border: rgba(255,255,255,0.08); --border-strong: rgba(255,255,255,0.16);
        --green: #34e37a; --green-soft: rgba(52,227,122,0.14); --green-dark: #1b9a55;
        --white: #f4f6f7; --gray: #9aa4ab; --gray-dim: #6c757b;
        --radius-lg: 16px; --radius-md: 12px; --radius-sm: 9px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
        background: var(--bg); color: var(--white);
        height: 100dvh; max-height: 100dvh; overflow: hidden;
        display: flex; flex-direction: column;
        padding: clamp(10px,1.4vh,18px) clamp(14px,2vw,28px);
        gap: clamp(8px,1.2vh,14px);
        background-image: radial-gradient(circle, rgba(52,227,122,0.14) 1px, transparent 1px);
        background-size: 20px 20px;
      }
      .sai-root * { box-sizing: border-box; }
      @media (max-width: 860px) { .sai-root { height: auto; max-height: none; overflow: visible; } }

      /* HEADER */
      .sai-header { flex: 0 0 auto; display: flex; align-items: center; justify-content: flex-start; gap: 16px; flex-wrap: nowrap; }
      .sai-header-left { display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1 1 auto; }
      .sai-logo { display: inline-flex; align-items: center; gap: 7px; font-weight: 800; font-size: 13px; letter-spacing: 0.06em; color: var(--green); text-transform: uppercase; flex-shrink: 0; }
      .sai-logo-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 10px var(--green); }
      .sai-headline { font-size: clamp(14px, 1.5vw, 19px); font-weight: 800; letter-spacing: -0.01em; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      .sai-equation { display: flex; align-items: center; gap: 14px; flex-wrap: nowrap; padding: 12px 22px; background: var(--bg-raise); border: 1px solid var(--border-strong); border-radius: 999px; flex-shrink: 0; }
      .sai-eq-part { font-weight: 800; font-size: clamp(13px, 1.25vw, 16.5px); padding: 9px 17px; border-radius: 999px; background: var(--bg-raise-2); border: 1px solid var(--border); white-space: nowrap; letter-spacing: 0.01em; }
      .sai-eq-part.total { background: var(--green-soft); color: var(--green); border-color: rgba(52,227,122,0.45); }
      .sai-eq-op { color: var(--gray-dim); font-weight: 800; font-size: 19px; padding: 0 2px; }
      @media (max-width: 1024px) {
        .sai-header { flex-wrap: wrap; }
        .sai-equation { flex-wrap: wrap; }
        .sai-headline { white-space: normal; overflow: visible; text-overflow: clip; }
      }

      /* TOOLBAR */
      .toolbar { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
      .tb-btn { width: 30px; height: 30px; border-radius: 50%; background: var(--bg-raise-2); border: 1px solid var(--border-strong); color: var(--gray); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: border-color 120ms ease, color 120ms ease; }
      .tb-btn:hover:not(:disabled) { color: var(--green); border-color: var(--green); }
      .tb-btn:disabled { opacity: 0.5; cursor: wait; }

      /* SELECTION AREA */
      .sai-selection { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      @media (max-width: 860px) { .sai-selection { grid-template-columns: 1fr; min-height: auto; } }

      .panel { background: var(--bg-raise); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: clamp(10px,1.3vh,16px); display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: visible; }
      .panel-head { flex: 0 0 auto; display: flex; align-items: baseline; justify-content: space-between; margin-bottom: clamp(6px,1vh,10px); }
      .panel-title { font-size: clamp(13px,1.15vw,16px); font-weight: 800; margin: 0; }
      .panel-note { color: var(--gray); font-size: clamp(10px,0.8vw,12px); margin: 0; }

      .plan-list { display: flex; flex-direction: column; gap: clamp(6px,0.9vh,10px); flex: 1 1 auto; min-height: 0; }
      .card { position: relative; flex: 1 1 0; min-height: 0; background: var(--bg-raise-2); border: 1px solid var(--border); border-radius: var(--radius-md); cursor: grab; outline: none;
        transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease, background 120ms ease;
        display: flex; flex-direction: column; justify-content: center; overflow: visible; }
      .card:hover { border-color: var(--border-strong); }
      .card:focus-visible { border-color: var(--green); box-shadow: 0 0 0 3px var(--green-soft); }
      .card-selected { border-color: var(--green); background: linear-gradient(180deg, rgba(52,227,122,0.09), rgba(52,227,122,0.02)); }
      .card-dragging { opacity: 0.4; transform: scale(0.98); box-shadow: 0 0 0 2px var(--green), 0 10px 24px rgba(0,0,0,0.5); cursor: grabbing; }
      .card-draghandle { position: absolute; left: 8px; top: 8px; color: var(--gray-dim); }
      .card-selected-badge { position: absolute; top: 8px; right: 8px; width: 17px; height: 17px; border-radius: 50%; background: var(--green); color: #06210f; display: flex; align-items: center; justify-content: center; }

      .card-plan { padding: 8px 14px 8px 26px; }
      .plan-top-row { display: flex; align-items: center; justify-content: space-between; height: 16px; margin-bottom: 2px; padding-right: 20px; }
      .plan-popular { font-size: 9.5px; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase; color: #06210f; background: var(--green); padding: 2px 7px; border-radius: 999px; }
      .info-btn { background: none; border: 1px solid var(--border-strong); color: var(--gray); width: 19px; height: 19px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
      .info-btn:hover { color: var(--green); border-color: var(--green); }
      .plan-name { font-size: clamp(12.5px,1.05vw,14.5px); font-weight: 800; margin: 0 0 1px; padding-right: 22px; }
      .plan-tagline { font-size: clamp(9.5px,0.75vw,11px); color: var(--gray); margin: 0 0 4px; }
      .plan-price-row { margin-bottom: 4px; }
      .plan-stats { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 5px; }
      .plan-stat { font-size: 9.5px; font-weight: 700; color: var(--green); background: var(--green-soft); border-radius: 999px; padding: 2px 8px; white-space: nowrap; }
      .plan-features { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
      .plan-features li { display: flex; gap: 5px; align-items: flex-start; font-size: 10.5px; color: var(--white); line-height: 1.3; }
      .feature-check { color: var(--green); margin-top: 1.5px; flex-shrink: 0; }

      .info-popover { position: absolute; z-index: 50; left: 0; right: 0; top: calc(100% + 6px); background: var(--bg-raise-2); border: 1px solid var(--green); border-radius: var(--radius-md); padding: 12px 14px; box-shadow: 0 16px 40px rgba(0,0,0,0.6); }
      .info-popover-title { font-size: 11.5px; font-weight: 800; color: var(--green); margin-bottom: 7px; }
      .info-popover ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
      .info-popover li { display: flex; gap: 6px; align-items: flex-start; font-size: 11.5px; line-height: 1.35; }

      .usage-subsection { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; }
      .usage-subsection.voice { flex: 1.28 1 0; margin-bottom: clamp(6px,1vh,10px); padding-bottom: clamp(4px,0.6vh,6px); border-bottom: 1px solid var(--border); }
      .usage-subsection.sms { flex: 0.72 1 0; }
      .usage-subhead-row { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: nowrap; min-width: 0; }
      .usage-subhead { font-size: clamp(10px,0.85vw,11.5px); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gray); white-space: nowrap; flex-shrink: 0; }
      .usage-subsection.sms .usage-subhead { margin-bottom: 6px; }
      .usage-grid-wrap { flex: 1 1 auto; min-height: 0; display: flex; align-items: center; }
      .usage-grid { width: 100%; display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; }
      @media (max-width: 860px) { .usage-grid { grid-template-columns: repeat(2, 1fr); } .usage-subsection { min-height: 140px; } }

      .info-badge-wrap { position: relative; display: inline-flex; min-width: 0; overflow: hidden; }
      .info-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 700; color: var(--green); background: var(--green-soft); border: 1px solid rgba(52,227,122,0.4); border-radius: 999px; padding: 3px 9px 3px 7px; cursor: pointer; white-space: nowrap; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
      .info-badge-full { display: none; }
      .info-badge-short { display: inline; }
      @media (min-width: 1680px) { .info-badge-full { display: inline; } .info-badge-short { display: none; } }
      .info-badge:hover { border-color: var(--green); }
      .badge-tooltip { position: absolute; z-index: 60; top: calc(100% + 6px); left: 0; width: 232px; background: var(--bg-raise-2); border: 1px solid var(--green); border-radius: var(--radius-sm); padding: 9px 11px; font-size: 10.5px; line-height: 1.4; color: var(--white); box-shadow: 0 16px 36px rgba(0,0,0,0.6); }

      .voice-footnote { flex: 0 0 auto; margin: 3px 0 0; font-size: 7.5px; line-height: 1.3; color: var(--gray-dim); }

      .card-voice { height: clamp(64px, 9vh, 90px); padding: 5px 5px 4px; align-items: center; justify-content: center; text-align: center; }
      .card-sms { height: clamp(54px, 7vh, 76px); padding: 5px 5px 5px; align-items: center; justify-content: center; text-align: center; }
      .card-voice .card-draghandle, .card-sms .card-draghandle { top: 5px; left: 5px; }
      .card-voice .card-selected-badge, .card-sms .card-selected-badge { top: 5px; right: 5px; width: 14px; height: 14px; }
      .usage-allowance { font-size: clamp(14px,1.35vw,19px); font-weight: 900; letter-spacing: -0.01em; margin-top: 2px; line-height: 1.1; }
      .usage-detail { font-size: 8px; color: var(--gray-dim); margin: 2px 0 3px; text-transform: uppercase; letter-spacing: 0.03em; }
      .usage-price-row { margin-top: 0; }
      .usage-dials { font-size: 8px; color: var(--gray); font-weight: 600; margin-top: 2px; }

      /* QUOTE BUILDER */
      .quote-section { flex: 0 0 auto; height: clamp(190px, 27vh, 250px); background: var(--bg-raise); border: 1px solid var(--border-strong); border-radius: var(--radius-lg); padding: clamp(10px,1.3vh,16px); display: flex; gap: 16px; }
      @media (max-width: 860px) { .quote-section { height: auto; flex-direction: column; } }
      .quote-left { flex: 0 0 63%; min-width: 0; display: flex; flex-direction: column; }
      .quote-title-row { flex: 0 0 auto; display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
      .quote-title { font-size: clamp(13px,1.15vw,15px); font-weight: 800; margin: 0; }
      .quote-sub { color: var(--gray); font-size: 10.5px; margin: 0; }
      .dropzones { flex: 1 1 auto; min-height: 0; display: flex; gap: 10px; }
      @media (max-width: 860px) { .dropzones { flex-direction: column; } }
      .dropzone { flex: 1 1 0; min-height: 0; background: var(--bg-raise-2); border: 2px dashed var(--border-strong); border-radius: var(--radius-md); padding: 10px 12px; display: flex; flex-direction: column; justify-content: center;
        transition: border-color 140ms ease, box-shadow 140ms ease, background 140ms ease; }
      .dropzone-filled { border-style: solid; border-color: var(--border); }
      .dropzone-hover { border-color: var(--green); border-style: solid; box-shadow: 0 0 0 3px var(--green-soft); background: rgba(52,227,122,0.06); }
      .dropzone-label { display: flex; align-items: center; justify-content: space-between; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; color: var(--gray); margin-bottom: 6px; }
      .dropzone-required { color: var(--green); font-weight: 700; } .dropzone-optional { color: var(--gray-dim); font-weight: 600; }
      .dropzone-empty { color: var(--gray-dim); font-size: 11.5px; }
      .dropzone-content { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .dropzone-item { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
      .dropzone-item-name { font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .dropzone-item-sub { font-size: 9px; font-weight: 600; color: var(--gray); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .dropzone-remove { background: none; border: 1px solid var(--border-strong); color: var(--gray); width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
      .dropzone-remove:hover { border-color: var(--green); color: var(--green); }
      .dropzone-change { font-size: 9.5px; color: var(--gray-dim); flex-shrink: 0; }

      .quote-right { flex: 0 0 34%; min-width: 0; display: flex; flex-direction: column; justify-content: center; border-left: 1px solid var(--border); padding-left: 16px; gap: 4px; }
      .summary-title { font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gray); margin-bottom: 2px; }
      .summary-line { display: flex; align-items: center; justify-content: space-between; font-size: 10.5px; color: var(--gray); gap: 8px; }
      .summary-line span:last-child { color: var(--white); font-weight: 700; flex-shrink: 0; }
      .summary-total-row { display: flex; align-items: baseline; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border-strong); }
      .summary-total-label { font-size: 11px; font-weight: 700; color: var(--white); }
      .summary-total-value { font-size: clamp(22px, 2.6vw, 32px); font-weight: 900; color: var(--green); letter-spacing: -0.02em; transition: transform 180ms ease; }
      .summary-total-value.pulse { transform: scale(1.08); }
      .summary-total-value.custom { font-size: clamp(13px, 1.4vw, 16px); }
      .summary-total-per { font-size: 0.32em; color: var(--gray); font-weight: 600; margin-left: 3px; }
      .quote-footer-row { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; gap: 8px; }
      .reset-btn { display: inline-flex; align-items: center; gap: 5px; background: none; border: 1px solid var(--border-strong); color: var(--gray); font-size: 10.5px; font-weight: 600; padding: 6px 10px; border-radius: 999px; cursor: pointer; }
      .reset-btn:hover { color: var(--white); border-color: var(--gray); }
      .cta-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--green); color: #06210f; font-size: 11.5px; font-weight: 800; padding: 8px 15px; border-radius: 999px; border: none; cursor: pointer; box-shadow: 0 6px 18px rgba(52,227,122,0.25); }
      .cta-btn:hover { transform: translateY(-1px); }

      /* Off-screen printable quote */
      .printable-offscreen { position: fixed; top: 0; left: -9999px; z-index: -1; }

      /* MODALS */
      .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
      .modal { width: 100%; max-width: 380px; max-height: 85vh; overflow-y: auto; background: var(--bg-raise); border: 1px solid var(--border-strong); border-radius: var(--radius-lg); padding: 22px; }
      .modal-wide { max-width: 560px; }
      .modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
      .modal-head h3 { margin: 0; font-size: 17px; font-weight: 800; }
      .modal-close { background: none; border: none; color: var(--gray); cursor: pointer; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
      .modal-close:hover { color: var(--white); background: var(--bg-raise-2); }
      .modal-note { font-size: 12px; color: var(--gray); line-height: 1.4; margin: 0 0 16px; }
      .field-label { display: block; font-size: 11px; font-weight: 700; color: var(--gray); text-transform: uppercase; letter-spacing: 0.03em; margin: 12px 0 5px; }
      .field-input { width: 100%; background: var(--bg-raise-2); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); color: var(--white); font-size: 13.5px; padding: 9px 11px; font-family: inherit; }
      .field-input:focus { outline: none; border-color: var(--green); }
      .field-textarea { min-height: 64px; resize: vertical; }
      .modal-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 20px; }
      .modal-btn-primary { background: var(--green); color: #06210f; font-weight: 800; font-size: 13px; border: none; border-radius: 999px; padding: 10px 18px; cursor: pointer; }
      .modal-btn-secondary { background: none; border: 1px solid var(--border-strong); color: var(--gray); font-weight: 600; font-size: 12.5px; border-radius: 999px; padding: 10px 16px; cursor: pointer; }
      .modal-btn-secondary:hover:not(:disabled) { color: var(--white); border-color: var(--gray); }
      .modal-btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }

      .quotes-empty { color: var(--gray-dim); font-size: 13px; padding: 20px 0; text-align: center; }
      .quotes-list { display: flex; flex-direction: column; gap: 8px; max-height: 340px; overflow-y: auto; }
      .quote-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--bg-raise-2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 12px; }
      .quote-row-main { min-width: 0; }
      .quote-row-name { font-size: 13.5px; font-weight: 700; }
      .quote-row-detail { font-size: 11px; color: var(--gray); margin-top: 2px; }
      .quote-row-date { font-size: 10px; color: var(--gray-dim); margin-top: 2px; }
      .rename-input { font-size: 13px; padding: 5px 8px; }
      .quote-row-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
      .qr-btn { background: var(--green-soft); color: var(--green); border: 1px solid rgba(52,227,122,0.4); font-weight: 700; font-size: 11.5px; border-radius: 999px; padding: 6px 12px; cursor: pointer; }
      .qr-icon { width: 26px; height: 26px; border-radius: 50%; background: none; border: 1px solid var(--border-strong); color: var(--gray); display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .qr-icon:hover { color: var(--white); border-color: var(--gray); }
      .qr-danger:hover { color: #ff6b6b; border-color: #ff6b6b; }

      /* TOAST */
      .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--bg-raise-2); border: 1px solid var(--green); color: var(--white); font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: 999px; box-shadow: 0 12px 32px rgba(0,0,0,0.5); z-index: 300; }
    `}</style>
  );
}
