/* global React, Icon, Pill, Button, Card, SectionLabel, Crest */

// =====================================================================
// Match Prep — supporting sections
//
// The prep page is a CHECKLIST. The teacher walks down it before the
// match: formation → opposition notes → set pieces → talking points →
// subs plan. Each block is independently completable; a left-rail
// summarises status so a teacher can see at a glance what's still open.
//
// AI is OPT-IN per block. Pressing "Suggest" calls the AI for that
// section only and drops a draft inline that the teacher accepts/edits.
// No autonomous behaviour — teachers stay the author. The right-side
// briefing panel is a separate, broader assistant that synthesises
// everything (opposition + squad + last meetings) into a one-page brief.
// =====================================================================

// ---------------------------------------------------------------------
// Prep checklist rail (left)
// ---------------------------------------------------------------------
const PrepRail = ({ items, activeId, onJump }) => (
  <div style={{
    display: "flex", flexDirection: "column",
    background: "var(--surface-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    padding: "12px 8px",
    boxShadow: "var(--shadow-sm)",
    position: "sticky", top: 0,
  }}>
    <div style={{
      padding: "4px 10px 10px", borderBottom: "1px solid var(--border-subtle)", marginBottom: 6,
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
        Prep checklist
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
        {items.filter(i => i.status === "done").length} of {items.length} ready
      </div>
    </div>
    {items.map(it => {
      const active = it.id === activeId;
      const tone = it.status === "done" ? "success" : it.status === "ai-draft" ? "accent" : it.status === "warning" ? "warning" : "neutral";
      const dotColor = {
        success: "var(--status-success)",
        accent: "var(--brand-accent)",
        warning: "var(--status-warning)",
        neutral: "var(--border-strong, var(--border-default))",
      }[tone];
      return (
        <button key={it.id} onClick={() => onJump?.(it.id)} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 10px",
          background: active ? "var(--brand-accent-tint)" : "transparent",
          border: "none",
          borderRadius: "var(--radius-md)",
          cursor: "pointer",
          textAlign: "left",
          color: active ? "var(--text-primary)" : "var(--text-secondary)",
          fontWeight: active ? 600 : 500,
          fontSize: 13,
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: "50%",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: it.status === "done" ? "var(--status-success)" : "transparent",
            border: it.status === "done" ? "none" : `1.5px solid ${dotColor}`,
            color: "white",
            flexShrink: 0,
          }}>
            {it.status === "done" && <Icon name="check" size={11} strokeWidth={3} />}
          </span>
          <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {it.label}
          </span>
          {it.status === "ai-draft" && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--brand-accent)", letterSpacing: "0.05em" }}>AI</span>
          )}
          {it.status === "warning" && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--status-warning)", letterSpacing: "0.05em" }}>!</span>
          )}
        </button>
      );
    })}
  </div>
);

// ---------------------------------------------------------------------
// AI affordance row — the standard "Suggest with AI" button + state
// ---------------------------------------------------------------------
const AISuggestBar = ({ state = "idle", onSuggest, onAccept, onDismiss, sources, draftLabel }) => {
  if (state === "idle") {
    return (
      <button onClick={onSuggest} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 10px",
        background: "transparent",
        border: "1px dashed var(--border-default)",
        borderRadius: "var(--radius-md)",
        color: "var(--text-secondary)",
        fontSize: 12, fontWeight: 500,
        cursor: "pointer",
      }}>
        <Icon name="sparkle" size={13} style={{ color: "var(--brand-accent)" }} />
        Suggest with AI
      </button>
    );
  }
  if (state === "loading") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 10px", fontSize: 12, color: "var(--text-tertiary)",
      }}>
        <span style={{
          width: 10, height: 10, borderRadius: "50%",
          border: "2px solid var(--border-default)",
          borderTopColor: "var(--brand-accent)",
          animation: "spin 0.8s linear infinite",
          display: "inline-block",
        }} />
        Drafting from {sources?.join(", ") || "context"}…
      </span>
    );
  }
  if (state === "draft") {
    return (
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "4px 4px 4px 10px",
        background: "var(--brand-accent-tint)",
        border: "1px solid var(--brand-accent)",
        borderRadius: "var(--radius-md)",
        fontSize: 12,
      }}>
        <Icon name="sparkle" size={12} style={{ color: "var(--brand-accent)" }} />
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{draftLabel || "AI draft"}</span>
        <Button variant="accent" size="sm" onClick={onAccept} style={{ height: 24, padding: "0 8px", fontSize: 11.5 }}>Keep</Button>
        <Button variant="ghost" size="sm" onClick={onDismiss} style={{ height: 24, padding: "0 8px", fontSize: 11.5 }}>Discard</Button>
      </div>
    );
  }
  return null;
};

// ---------------------------------------------------------------------
// Prep section wrapper
// ---------------------------------------------------------------------
const PrepSection = ({ id, icon, title, status, children, action, anchor = true }) => (
  <Card padded={false} style={{ scrollMarginTop: 16 }}>
    <div id={anchor ? id : undefined} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 18px",
      borderBottom: "1px solid var(--border-subtle)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          width: 30, height: 30, borderRadius: "var(--radius-md)",
          background: "var(--surface-sunken)", color: "var(--text-secondary)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}><Icon name={icon} size={15} /></span>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            {title}
          </div>
          {status && (
            <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 1 }}>
              {status}
            </div>
          )}
        </div>
      </div>
      {action}
    </div>
    <div style={{ padding: "16px 18px" }}>
      {children}
    </div>
  </Card>
);

// ---------------------------------------------------------------------
// Opposition notes
// ---------------------------------------------------------------------
const OppositionNotesBlock = ({ aiState = "idle", notes, onSuggest, onAccept, onDismiss }) => (
  <PrepSection
    id="opposition"
    icon="search"
    title="Opposition notes"
    status="From last meeting · Sept"
    action={<AISuggestBar state={aiState} sources={["last meeting", "season form"]} draftLabel="AI draft" onSuggest={onSuggest} onAccept={onAccept} onDismiss={onDismiss} />}
  >
    {aiState === "draft" ? (
      <div style={{
        background: "var(--brand-accent-tint)",
        border: "1px solid var(--brand-accent)",
        borderRadius: "var(--radius-md)",
        padding: "12px 14px",
        fontSize: 13, lineHeight: 1.55, color: "var(--text-primary)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 11, fontWeight: 700, color: "var(--brand-accent)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          <Icon name="sparkle" size={11} /> AI draft · review before saving
        </div>
        <p style={{ margin: 0, marginBottom: 8 }}>
          <strong>Whitfield play a high 4-3-3 line</strong> — when we beat the press they're vulnerable to balls behind the right-back. <strong>#7 Mia Carter</strong> is their main outlet on the left wing.
        </p>
        <p style={{ margin: 0, marginBottom: 8 }}>
          They scored 3 of their last 6 goals from corners. Tall #4 at back post is the target.
        </p>
        <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-tertiary)" }}>
          Drafted from your September fixture notes and their last 4 league results.
        </p>
      </div>
    ) : notes ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {notes.map((n, i) => (
          <div key={i} style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 12,
            padding: "8px 0",
            borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)",
          }}>
            <Pill tone={n.tone} dot style={{ fontSize: 10.5, alignSelf: "flex-start" }}>{n.tag}</Pill>
            <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-primary)" }}>{n.text}</span>
          </div>
        ))}
      </div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 4px" }}>
        <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
          Nothing logged yet. Add notes from your scouting, or let AI draft them from past fixtures.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" size="sm" icon="edit">Add manually</Button>
        </div>
      </div>
    )}
  </PrepSection>
);

// ---------------------------------------------------------------------
// Set pieces
// ---------------------------------------------------------------------
const SetPieceCard = ({ kind, takerName, takerNumber, target, note }) => (
  <div style={{
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-md)",
    padding: "10px 12px",
    background: "var(--surface-card)",
    display: "flex", flexDirection: "column", gap: 6,
  }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>{kind}</span>
      <Icon name="edit" size={12} style={{ color: "var(--text-tertiary)" }} />
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        width: 22, height: 22, borderRadius: "50%",
        background: "var(--surface-sunken)", border: "1px solid var(--border-subtle)",
        fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
        color: "var(--text-primary)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}>{takerNumber}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{takerName}</span>
    </div>
    {target && <div style={{ fontSize: 12, color: "var(--text-secondary)" }}><strong>Target:</strong> {target}</div>}
    {note && <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{note}</div>}
  </div>
);

const SetPiecesBlock = () => (
  <PrepSection
    id="setpieces"
    icon="target"
    title="Set pieces"
    status="3 routines assigned"
    action={<AISuggestBar state="idle" />}
  >
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 10,
    }}>
      <SetPieceCard kind="Corners (att.)" takerName="T. Lindgren" takerNumber={10} target="Far post · #6 Carrington" note="In-swinger from right" />
      <SetPieceCard kind="Free kicks (att.)" takerName="T. Lindgren" takerNumber={10} target="Direct on goal inside 25m" />
      <SetPieceCard kind="Penalties" takerName="R. Asante" takerNumber={9} target="Bottom-left corner" note="Backup: Lindgren" />
      <SetPieceCard kind="Defending corners" takerName="Zonal mark" takerNumber={"·"} note="Hassan & Whitford on posts" />
    </div>
  </PrepSection>
);

// ---------------------------------------------------------------------
// Pre-match talking points
// ---------------------------------------------------------------------
const TalkingPointsBlock = ({ aiState = "idle", points, onSuggest, onAccept, onDismiss }) => (
  <PrepSection
    id="talkingpoints"
    icon="chat"
    title="Pre-match talking points"
    status="Read out in the dressing room"
    action={<AISuggestBar state={aiState} sources={["opposition notes", "training focus"]} draftLabel="3 points drafted" onSuggest={onSuggest} onAccept={onAccept} onDismiss={onDismiss} />}
  >
    {points.length > 0 ? (
      <ol style={{
        margin: 0, paddingLeft: 0, listStyle: "none",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {points.map((p, i) => (
          <li key={i} style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 12, alignItems: "flex-start",
            padding: 10,
            background: p.aiDraft ? "var(--brand-accent-tint)" : "var(--surface-sunken)",
            border: p.aiDraft ? "1px solid var(--brand-accent)" : "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
          }}>
            <span style={{
              width: 24, height: 24, borderRadius: "50%",
              background: "var(--brand-primary)", color: "var(--on-brand-primary)",
              fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>{i + 1}</span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                {p.title}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.45 }}>
                {p.detail}
              </div>
            </div>
            {p.aiDraft && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--brand-accent)", letterSpacing: "0.05em" }}>AI</span>
            )}
          </li>
        ))}
      </ol>
    ) : (
      <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>No talking points yet. Add up to 3 — keep them short.</div>
    )}
  </PrepSection>
);

// ---------------------------------------------------------------------
// Planned subs
// ---------------------------------------------------------------------
const SubsPlanBlock = ({ subs }) => (
  <PrepSection
    id="subs"
    icon="swap"
    title="Planned substitutions"
    status="Indicative — adjust in-match"
    action={<Button variant="ghost" size="sm" icon="plus">Add</Button>}
  >
    {subs.length > 0 ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {subs.map((s, i) => (
          <div key={i} style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto 1fr auto",
            alignItems: "center", gap: 12,
            padding: "10px 12px",
            background: "var(--surface-sunken)",
            borderRadius: "var(--radius-md)",
          }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 700,
              color: "var(--text-tertiary)", letterSpacing: "0.04em",
            }}>~{s.minute}'</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--status-error)", fontSize: 14, fontWeight: 700 }}>↓</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{s.off}</span>
            </div>
            <Icon name="swap" size={14} style={{ color: "var(--text-tertiary)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--status-success)", fontSize: 14, fontWeight: 700 }}>↑</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{s.on}</span>
            </div>
            <span style={{ fontSize: 11.5, color: "var(--text-tertiary)", textAlign: "right" }}>{s.reason}</span>
          </div>
        ))}
      </div>
    ) : (
      <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>No subs planned. Most teachers add 1–2 indicative changes here so the bench knows what to expect.</div>
    )}
  </PrepSection>
);

// ---------------------------------------------------------------------
// Read-only squad / kit jump-links
// ---------------------------------------------------------------------
const JumpLinkBlock = ({ items }) => (
  <Card padded={false}>
    <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
      <SectionLabel>Linked from this match</SectionLabel>
    </div>
    <div style={{ display: "flex", flexDirection: "column" }}>
      {items.map((it, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 18px",
          borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)",
          cursor: "pointer",
        }}>
          <span style={{
            width: 32, height: 32, borderRadius: "var(--radius-md)",
            background: "var(--surface-sunken)", color: "var(--text-secondary)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}><Icon name={it.icon} size={15} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>{it.label}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>{it.detail}</div>
          </div>
          <Icon name="chevron" size={14} style={{ color: "var(--text-tertiary)" }} />
        </div>
      ))}
    </div>
  </Card>
);

// ---------------------------------------------------------------------
// Right-side AI tactical briefing panel
// ---------------------------------------------------------------------
const BriefingPanel = ({ open, onClose, generated = true }) => (
  <div style={{
    width: 380, height: "100%",
    background: "var(--surface-card)",
    borderLeft: "1px solid var(--border-default)",
    display: "flex", flexDirection: "column",
    flexShrink: 0,
    boxShadow: "-12px 0 32px rgba(15,30,61,0.08)",
  }}>
    <div style={{
      padding: "14px 18px",
      borderBottom: "1px solid var(--border-subtle)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "linear-gradient(135deg, var(--brand-primary), #1a2f5e)",
      color: "white",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          width: 32, height: 32, borderRadius: "var(--radius-md)",
          background: "rgba(255,255,255,0.12)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: "var(--brand-accent)",
        }}><Icon name="sparkle" size={16} /></span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>Tactical briefing</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Generated for this fixture</div>
        </div>
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="Close briefing"
          style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.85)", cursor: "pointer", display: "inline-flex", padding: 4 }}>
          <Icon name="close" size={18} />
        </button>
      )}
    </div>

    {!generated ? (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: 24, gap: 12,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "var(--brand-accent-tint)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--brand-accent)",
        }}><Icon name="sparkle" size={24} /></div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>No briefing yet</div>
        <div style={{ fontSize: 12.5, color: "var(--text-secondary)", maxWidth: 280, lineHeight: 1.5 }}>
          Generate a one-page briefing from the opposition notes, last meetings and your current squad availability.
        </div>
        <Button variant="primary" icon="sparkle" size="md">Generate briefing</Button>
      </div>
    ) : (
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px 24px" }}>
        <div style={{
          background: "var(--surface-sunken)",
          padding: "10px 12px",
          borderRadius: "var(--radius-md)",
          fontSize: 11.5, color: "var(--text-tertiary)", lineHeight: 1.5,
          marginBottom: 14,
          display: "flex", alignItems: "flex-start", gap: 8,
        }}>
          <Icon name="info" size={13} style={{ color: "var(--text-tertiary)", marginTop: 1, flexShrink: 0 }} />
          <span>Drafted from <strong>last 3 fixtures</strong>, your <strong>Sept scouting note</strong>, and current squad availability. Always your call — review before sharing.</span>
        </div>

        <SectionLabel>How they'll set up</SectionLabel>
        <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.55, marginBottom: 4 }}>
          Whitfield have used a <strong>high 4-3-3</strong> in 4 of their last 5 games. Their press triggers off the centre-back's first touch.
        </div>
        <div style={{
          display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16,
          paddingBottom: 14, borderBottom: "1px solid var(--border-subtle)",
        }}>
          <Pill tone="neutral" dot>4-3-3 (78%)</Pill>
          <Pill tone="neutral" dot>High line</Pill>
          <Pill tone="neutral" dot>Wing overload right</Pill>
        </div>

        <SectionLabel>Threats</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid var(--border-subtle)" }}>
          {[
            { who: "#7 Mia Carter", note: "8 goals this season, all from left wing cuts inside" },
            { who: "Set pieces", note: "3 of last 6 goals from corners (back-post #4)" },
            { who: "Counter-press", note: "Aggressive in their attacking third — cleanest exit is wide" },
          ].map((t, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10 }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%",
                background: "var(--status-error-tint)", color: "var(--status-error)",
                fontSize: 10, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, marginTop: 1,
              }}>!</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{t.who}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.45 }}>{t.note}</div>
              </div>
            </div>
          ))}
        </div>

        <SectionLabel>Opportunities</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid var(--border-subtle)" }}>
          {[
            { who: "Space behind RB", note: "Their right-back pushes high — Adekunle 1v1 looks favourable" },
            { who: "Second balls", note: "They lose 60% of midfield duels in last 20'" },
          ].map((t, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10 }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%",
                background: "var(--status-success-tint)", color: "var(--status-success)",
                fontSize: 11, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, marginTop: 1,
              }}>↑</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{t.who}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.45 }}>{t.note}</div>
              </div>
            </div>
          ))}
        </div>

        <SectionLabel>Suggested approach</SectionLabel>
        <div style={{
          background: "var(--brand-accent-tint)",
          border: "1px solid var(--brand-accent)",
          borderRadius: "var(--radius-md)",
          padding: "12px 14px",
          fontSize: 13, lineHeight: 1.55, color: "var(--text-primary)",
          marginBottom: 14,
        }}>
          Press their CB on first touch to force long balls. In possession, switch early to <strong>Adekunle on the left</strong> to isolate their RB. Drop deeper from minute 60 — they tire late.
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="primary" icon="check" size="sm" style={{ flex: 1 }}>Apply to prep</Button>
          <Button variant="ghost" icon="share" size="sm">Share</Button>
        </div>

        <div style={{ marginTop: 14, fontSize: 11, color: "var(--text-tertiary)", textAlign: "center" }}>
          Generated 3 minutes ago · <a href="#" style={{ color: "var(--brand-accent)", fontWeight: 600 }}>Regenerate</a>
        </div>
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------
// Demo content
// ---------------------------------------------------------------------
const DEMO_OPPOSITION_NOTES = [
  { tone: "warning", tag: "Watch", text: "#7 Mia Carter — left wing. Cuts inside on her right foot, 8 goals this season." },
  { tone: "warning", tag: "Set piece", text: "Back-post target on corners is their #4. Big lad. Mark tight." },
  { tone: "success", tag: "Weakness", text: "Their RB pushes very high — space in behind for our LW (Adekunle)." },
  { tone: "neutral", tag: "Shape", text: "4-3-3 with a high line. Press triggers off the CB's first touch." },
];

const DEMO_TALKING_POINTS = [
  { title: "Press their CB on first touch.", detail: "Win it high, attack quickly. We did this well vs Eastleigh." },
  { title: "Switch the ball early to Adekunle.", detail: "Their RB pushes up — we want him 1v1 facing forward." },
  { title: "Set-piece discipline.", detail: "Hassan and Whitford on posts. Mark their #4 — DO NOT lose him." },
];

const DEMO_SUBS = [
  { minute: 55, off: "M. Hill (RW)", on: "F. Tan (RW)", reason: "Fresh legs · keep pressing" },
  { minute: 65, off: "T. Lindgren (CM)", on: "G. Whitaker (CM)", reason: "See out the game" },
];

const DEMO_PREP_RAIL = [
  { id: "formation",   label: "Starting XI",            status: "done" },
  { id: "opposition",  label: "Opposition notes",       status: "done" },
  { id: "setpieces",   label: "Set pieces",             status: "done" },
  { id: "talkingpoints", label: "Talking points",       status: "ai-draft" },
  { id: "subs",        label: "Planned subs",           status: "done" },
  { id: "kit",         label: "Kit & equipment",        status: "warning" },
];

// ---------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------
window.PrepRail = PrepRail;
window.AISuggestBar = AISuggestBar;
window.PrepSection = PrepSection;
window.OppositionNotesBlock = OppositionNotesBlock;
window.SetPiecesBlock = SetPiecesBlock;
window.TalkingPointsBlock = TalkingPointsBlock;
window.SubsPlanBlock = SubsPlanBlock;
window.JumpLinkBlock = JumpLinkBlock;
window.BriefingPanel = BriefingPanel;
window.DEMO_OPPOSITION_NOTES = DEMO_OPPOSITION_NOTES;
window.DEMO_TALKING_POINTS = DEMO_TALKING_POINTS;
window.DEMO_SUBS = DEMO_SUBS;
window.DEMO_PREP_RAIL = DEMO_PREP_RAIL;
