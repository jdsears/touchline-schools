/* global React, Sidebar, TopBar, TabStrip, MatchHeader, Icon, Button, Crest, Pill, Card, SectionLabel,
   PrepRail, OppositionNotesBlock, SetPiecesBlock, TalkingPointsBlock, SubsPlanBlock, JumpLinkBlock, BriefingPanel,
   FormationPitch, RosterSheet, FOOTBALL_PRESETS, DEMO_SQUAD, DEFAULT_ASSIGNMENT_4_3_3,
   DEMO_OPPOSITION_NOTES, DEMO_TALKING_POINTS, DEMO_SUBS, DEMO_PREP_RAIL */

// =====================================================================
// Match Prep page — assembles formation editor + prep checklist sections
// + optional right-side AI tactical briefing.
//
// Layout (desktop):
//   [Sidebar][TopBar over]
//                ┌──────────────────────────────────────────────────────────┐
//                │  MatchHeader (compact)                                    │
//                ├──────────┬──────────────────────────────┬─────────────────┤
//                │  Rail    │  Centre column                │ Briefing       │
//                │  (sticky)│  - Formation editor card      │ (toggleable)   │
//                │          │  - Opposition notes           │                │
//                │          │  - Set pieces                 │                │
//                │          │  - Talking points             │                │
//                │          │  - Subs                       │                │
//                │          │  - Squad / kit jump-links     │                │
//                └──────────┴──────────────────────────────┴─────────────────┘
//
// Mobile collapses the rail into a horizontal step-strip and stacks
// everything; the formation editor swaps to a touch-optimised layout
// where tapping a slot opens a bottom sheet.
// =====================================================================

// ---------------------------------------------------------------------
// Formation editor card (desktop)
// ---------------------------------------------------------------------
const FormationEditorCard = ({
  size = "11v11",
  presetKey = "4-3-3",
  assignment,
  squad = DEMO_SQUAD,
  focusedSlotId,
  onFocusSlot,
  onPick,
  onClear,
  onChangePreset,
  onChangeSize,
  width = 380,
  height = 580,
}) => {
  const presets = FOOTBALL_PRESETS[size] || {};
  const preset = presets[presetKey] || Object.values(presets)[0];
  const benchIds = squad.map(p => p.id).filter(id => !Object.values(assignment).includes(id));
  const focusedSlot = focusedSlotId ? preset.slots.find(s => s.id === focusedSlotId) : null;

  return (
    <Card padded={false}>
      {/* Header */}
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 30, height: 30, borderRadius: "var(--radius-md)",
            background: "var(--brand-primary)", color: "var(--brand-accent)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}><Icon name="formation" size={15} /></span>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text-primary)" }}>Starting XI</div>
            <div style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>
              {Object.values(assignment).filter(Boolean).length}/{preset.slots.length} placed · Tap a slot to assign
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Size segmented */}
          <div style={{
            display: "inline-flex",
            background: "var(--surface-sunken)",
            borderRadius: "var(--radius-sm)",
            padding: 2,
            border: "1px solid var(--border-subtle)",
          }}>
            {Object.keys(FOOTBALL_PRESETS).map(s => (
              <button key={s} onClick={() => onChangeSize?.(s)} style={{
                padding: "4px 10px",
                background: s === size ? "var(--surface-card)" : "transparent",
                border: "none",
                borderRadius: 4,
                fontSize: 11.5, fontWeight: 600,
                color: s === size ? "var(--text-primary)" : "var(--text-tertiary)",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                boxShadow: s === size ? "0 1px 2px rgba(15,30,61,0.08)" : "none",
              }}>{s}</button>
            ))}
          </div>
          {/* Preset dropdown — drawn as a chip with chev */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "4px 8px",
            background: "var(--surface-sunken)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            fontSize: 12, fontWeight: 600,
            cursor: "pointer", color: "var(--text-primary)",
          }}>
            {presetKey}
            <Icon name="chevronDown" size={12} style={{ color: "var(--text-tertiary)" }} />
          </div>
          <Button variant="ghost" icon="copy" size="sm">Save as</Button>
        </div>
      </div>

      {/* Body: pitch + roster sheet OR pitch + bench */}
      <div style={{ display: "grid", gridTemplateColumns: `${width}px 1fr`, minHeight: height + 32 }}>
        <div style={{ padding: 16, borderRight: "1px solid var(--border-subtle)", background: "var(--surface-sunken)" }}>
          <FormationPitch
            preset={preset}
            assignment={assignment}
            squad={squad}
            focusedSlotId={focusedSlotId}
            onSlotClick={onFocusSlot}
            width={width - 32}
            height={height}
            scale={0.9}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          {focusedSlot ? (
            <RosterSheet
              slot={focusedSlot}
              currentPlayerId={assignment[focusedSlot.id]}
              assignment={assignment}
              squad={squad}
              onPick={(pid) => onPick?.(focusedSlot.id, pid)}
              onClear={() => onClear?.(focusedSlot.id)}
              onClose={() => onFocusSlot?.(null)}
              embedded
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{
                padding: "12px 18px",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Bench &amp; unassigned</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>{benchIds.length} players · drag onto a slot or tap a slot first</div>
                </div>
                <Button variant="ghost" size="sm" icon="sparkle">Auto-fill</Button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
                {benchIds.map(id => {
                  const p = squad.find(x => x.id === id);
                  if (!p) return null;
                  const queried = p.status === "queried";
                  return (
                    <div key={id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px",
                      borderRadius: "var(--radius-md)",
                      cursor: "grab",
                      marginBottom: 2,
                    }}>
                      <Icon name="grip" size={14} style={{ color: "var(--text-tertiary)" }} />
                      <span style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: "var(--surface-sunken)", border: "1px solid var(--border-subtle)",
                        fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                        color: "var(--text-primary)",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                      }}>{p.number}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{p.preferred.join(" · ")}</div>
                      </div>
                      {queried && <Pill tone="warning" dot style={{ fontSize: 10 }}>Medical</Pill>}
                    </div>
                  );
                })}
                {benchIds.length === 0 && (
                  <div style={{ padding: 16, fontSize: 12.5, color: "var(--text-tertiary)", textAlign: "center" }}>
                    All squad members placed.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------
// Compact Match header for prep page (re-uses MatchHeader)
// ---------------------------------------------------------------------
const PrepMatchHeader = ({ isMobile }) => {
  const home = { name: "Ashworth Park Academy", short: "Ashworth Park", initials: "AP", isUs: true, record: "W3 D1 L1" };
  const away = { name: "Whitfield High School", short: "Whitfield", initials: "WH", todoCrest: true };
  const fixture = {
    kickoffTime: "14:00",
    kickoffDate: "Sat, 2 May",
    kickoffFull: "Saturday 2 May 2026, 14:00",
    venue: "Ashworth Park, North Pitch",
    homeAway: "home",
    competition: "Surrey Schools' League · Yr 9",
  };
  return (
    <MatchHeader
      state="pre"
      fixture={fixture}
      home={home}
      away={away}
      countdown="3 days"
      lastMeeting="Lost 1-2 (Sept '25)"
      weather={{ icon: "cloud", text: "Light wind, dry · 11°C" }}
      isMobile={isMobile}
    />
  );
};

// ---------------------------------------------------------------------
// Page (desktop)
// ---------------------------------------------------------------------
const MatchPrepPage = ({
  schoolTheme = "moonboots",
  briefingOpen = false,
  briefingGenerated = true,
  variant = "default", // default | empty | focused
  initialFocusSlot = null,
}) => {
  const [assignment, setAssignment] = React.useState(DEFAULT_ASSIGNMENT_4_3_3);
  const [focusedSlot, setFocusedSlot] = React.useState(initialFocusSlot);
  const [size, setSize] = React.useState("11v11");
  const [presetKey, setPresetKey] = React.useState("4-3-3");

  const handlePick = (slotId, playerId) => {
    setAssignment(prev => {
      const next = { ...prev };
      // If the player is currently elsewhere, swap.
      const existingSlot = Object.entries(next).find(([k, v]) => v === playerId)?.[0];
      const displaced = next[slotId];
      next[slotId] = playerId;
      if (existingSlot && existingSlot !== slotId) next[existingSlot] = displaced ?? null;
      return next;
    });
    setFocusedSlot(null);
  };
  const handleClear = (slotId) => {
    setAssignment(prev => ({ ...prev, [slotId]: null }));
    setFocusedSlot(null);
  };

  const isEmpty = variant === "empty";
  const railItems = isEmpty
    ? DEMO_PREP_RAIL.map(r => ({ ...r, status: r.id === "formation" ? "warning" : "neutral" }))
    : DEMO_PREP_RAIL;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: briefingOpen ? "minmax(0, 1fr) 380px" : "minmax(0, 1fr)",
      flex: 1,
      minHeight: 0,
    }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 32px", minWidth: 0 }}>
        <div style={{ marginBottom: 18 }}>
          <PrepMatchHeader />
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "200px minmax(0, 1fr)",
          gap: 20,
          alignItems: "start",
        }}>
          <PrepRail items={railItems} activeId="formation" />

          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            {/* Section heading */}
            <div style={{
              display: "flex", alignItems: "baseline", justifyContent: "space-between",
              padding: "0 4px",
            }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
                  Match prep
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                  Your final brief before kick-off. Sections save automatically.
                </div>
              </div>
              {!briefingOpen && (
                <Button variant="primary" icon="sparkle" size="sm">
                  Open AI tactical briefing
                </Button>
              )}
            </div>

            <FormationEditorCard
              size={size}
              presetKey={presetKey}
              assignment={isEmpty ? Object.fromEntries(Object.keys(DEFAULT_ASSIGNMENT_4_3_3).map(k => [k, null])) : assignment}
              focusedSlotId={focusedSlot}
              onFocusSlot={setFocusedSlot}
              onPick={handlePick}
              onClear={handleClear}
              onChangeSize={setSize}
              onChangePreset={setPresetKey}
            />

            <OppositionNotesBlock notes={isEmpty ? null : DEMO_OPPOSITION_NOTES} aiState="idle" />
            <SetPiecesBlock />
            <TalkingPointsBlock points={DEMO_TALKING_POINTS} aiState="draft" />
            <SubsPlanBlock subs={DEMO_SUBS} />
            <JumpLinkBlock items={[
              { icon: "users", label: "Squad availability", detail: "16 of 18 ready · 2 queried" },
              { icon: "shirt", label: "Kit & equipment", detail: "Home strip · check 2 spare shirts" },
              { icon: "videos", label: "Video clips", detail: "3 from training this week" },
            ]} />
          </div>
        </div>
      </div>

      {briefingOpen && (
        <BriefingPanel open={briefingOpen} generated={briefingGenerated} />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// Mobile prep page — touchline-grade
// ---------------------------------------------------------------------
const MobileFormationEditor = ({ assignment, squad, focusedSlot, onFocusSlot, onPick, onClear, presetKey = "4-3-3" }) => {
  const preset = FOOTBALL_PRESETS["11v11"][presetKey];
  const focused = focusedSlot ? preset.slots.find(s => s.id === focusedSlot) : null;
  return (
    <div style={{
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{
        padding: "12px 14px",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 26, height: 26, borderRadius: "var(--radius-sm)",
            background: "var(--brand-primary)", color: "var(--brand-accent)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}><Icon name="formation" size={13} /></span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Starting XI · {presetKey}</div>
            <div style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>{Object.values(assignment).filter(Boolean).length}/11 placed</div>
          </div>
        </div>
        <div style={{
          padding: "3px 8px",
          background: "var(--surface-sunken)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 4,
          fontSize: 11, fontWeight: 600,
          fontFamily: "var(--font-mono)",
          color: "var(--text-primary)",
          display: "inline-flex", alignItems: "center", gap: 3,
        }}>11v11 <Icon name="chevronDown" size={10} style={{ color: "var(--text-tertiary)" }} /></div>
      </div>

      <div style={{ padding: 12, background: "var(--surface-sunken)", display: "flex", justifyContent: "center" }}>
        <FormationPitch
          preset={preset}
          assignment={assignment}
          squad={squad}
          focusedSlotId={focusedSlot}
          onSlotClick={onFocusSlot}
          width={300}
          height={460}
          scale={0.85}
        />
      </div>

      {/* Bottom sheet */}
      {focused && (
        <div style={{
          position: "absolute", left: 10, right: 10, bottom: 10,
          background: "var(--surface-card)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 -8px 24px rgba(15,30,61,0.18)",
          maxHeight: "65%",
          display: "flex", flexDirection: "column",
          zIndex: 30,
          overflow: "hidden",
        }}>
          <div style={{
            display: "flex", justifyContent: "center", paddingTop: 6, paddingBottom: 2,
          }}>
            <span style={{ width: 32, height: 4, borderRadius: 2, background: "var(--border-default)" }} />
          </div>
          <RosterSheet
            slot={focused}
            currentPlayerId={assignment[focused.id]}
            assignment={assignment}
            squad={squad}
            onPick={(pid) => onPick?.(focused.id, pid)}
            onClear={() => onClear?.(focused.id)}
            onClose={() => onFocusSlot?.(null)}
            embedded
          />
        </div>
      )}
    </div>
  );
};

const MobilePrepPage = ({ focusedSlotInitial = null, sheetOpen = false }) => {
  const [assignment, setAssignment] = React.useState(DEFAULT_ASSIGNMENT_4_3_3);
  const [focusedSlot, setFocusedSlot] = React.useState(sheetOpen ? "lw" : focusedSlotInitial);

  const handlePick = (slotId, playerId) => {
    setAssignment(prev => {
      const next = { ...prev };
      const existingSlot = Object.entries(next).find(([k, v]) => v === playerId)?.[0];
      const displaced = next[slotId];
      next[slotId] = playerId;
      if (existingSlot && existingSlot !== slotId) next[existingSlot] = displaced ?? null;
      return next;
    });
    setFocusedSlot(null);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 80px" }}>
        <PrepMatchHeader isMobile />

        {/* Step strip — horizontal rail */}
        <div style={{
          display: "flex", gap: 6, overflowX: "auto",
          margin: "14px -14px 0",
          padding: "2px 14px 8px",
        }}>
          {DEMO_PREP_RAIL.map((r, i) => {
            const active = r.id === "formation";
            const tone = r.status === "done" ? "var(--status-success)" : r.status === "ai-draft" ? "var(--brand-accent)" : r.status === "warning" ? "var(--status-warning)" : "var(--border-default)";
            return (
              <div key={r.id} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 10px",
                background: active ? "var(--brand-accent-tint)" : "var(--surface-card)",
                border: `1px solid ${active ? "var(--brand-accent)" : "var(--border-subtle)"}`,
                borderRadius: 999,
                fontSize: 11.5, fontWeight: 600,
                whiteSpace: "nowrap",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                flexShrink: 0,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: r.status === "done" ? tone : "transparent", border: r.status === "done" ? "none" : `1.5px solid ${tone}` }} />
                {r.label}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
          <MobileFormationEditor
            assignment={assignment}
            squad={DEMO_SQUAD}
            focusedSlot={focusedSlot}
            onFocusSlot={setFocusedSlot}
            onPick={handlePick}
            onClear={(slotId) => setAssignment(prev => ({ ...prev, [slotId]: null }))}
          />

          <button style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "10px 14px",
            background: "var(--brand-primary)", color: "var(--on-brand-primary)",
            border: "none", borderRadius: "var(--radius-md)",
            fontSize: 13, fontWeight: 600,
          }}>
            <Icon name="sparkle" size={14} /> Open AI tactical briefing
          </button>

          <OppositionNotesBlock notes={DEMO_OPPOSITION_NOTES} aiState="idle" />
          <TalkingPointsBlock points={DEMO_TALKING_POINTS} aiState="draft" />
          <SubsPlanBlock subs={DEMO_SUBS} />
        </div>
      </div>

      {/* Sticky kick-off bar — touchline-grade, big tap targets */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        padding: "10px 14px",
        background: "var(--surface-card)",
        borderTop: "1px solid var(--border-subtle)",
        boxShadow: "0 -2px 12px rgba(15,30,61,0.06)",
        display: "flex", alignItems: "center", gap: 10,
        zIndex: 5,
      }}>
        <div style={{ flex: 1, fontSize: 11.5, color: "var(--text-tertiary)" }}>
          <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 12.5 }}>Saturday · 14:00</div>
          5 of 6 prep items ready
        </div>
        <Button variant="primary" icon="check" size="md" style={{ height: 44 }}>Mark ready</Button>
      </div>
    </div>
  );
};

window.MatchPrepPage = MatchPrepPage;
window.MobilePrepPage = MobilePrepPage;
window.FormationEditorCard = FormationEditorCard;
window.MobileFormationEditor = MobileFormationEditor;
window.PrepMatchHeader = PrepMatchHeader;
