/* global React, Icon, Crest, Pill, Button, Card, SectionLabel */

// ReadinessPanel: spans pre-match, live, and post-match.
// Pre-match: checklist with relative timestamps (replaces the standalone
// "what happens next" timeline).
// Live: condensed view of squad + formation + key events scroll.
// Post-match: result summary (final score, scorers, standout, links to Report).

const RowDivider = () => (
  <div style={{ height: 1, background: "var(--border-subtle)" }} />
);

const ChecklistRow = ({
  state, // "done" | "pending" | "blocked"
  title,
  meta,
  detail,
  action,
}) => {
  const tone = {
    done:    { fg: "var(--status-success)", bg: "var(--status-success-tint)", icon: "check" },
    pending: { fg: "var(--text-tertiary)", bg: "var(--surface-sunken)",       icon: "circle" },
    blocked: { fg: "var(--status-warning)", bg: "var(--status-warning-tint)", icon: "bell" },
  }[state];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      alignItems: "center",
      gap: 14,
      padding: "14px 0",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: tone.bg, color: tone.fg,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon name={tone.icon} size={state === "pending" ? 8 : 14} strokeWidth={2.2} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 14, fontWeight: 600,
            color: state === "pending" ? "var(--text-secondary)" : "var(--text-primary)",
            textDecoration: state === "done" ? "none" : "none",
          }}>{title}</span>
          {meta && (
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500 }}>
              {meta}
            </span>
          )}
        </div>
        {detail && (
          <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{detail}</span>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

const PreMatchReadiness = ({ checklist, isMobile }) => {
  const doneCount = checklist.filter(c => c.state === "done").length;
  const total = checklist.length;
  const pct = (doneCount / total) * 100;

  return (
    <Card padded={false}>
      <div style={{ padding: "var(--space-5) var(--space-6) var(--space-3)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <h2 style={{
              margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em",
              color: "var(--text-primary)",
            }}>Match readiness</h2>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {doneCount} of {total} steps complete
            </span>
          </div>
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                {Math.round(pct)}%
              </span>
              <div style={{
                width: 120, height: 6, background: "var(--surface-sunken)",
                borderRadius: "var(--radius-full)", overflow: "hidden",
              }}>
                <div style={{
                  width: `${pct}%`, height: "100%",
                  background: "var(--brand-accent)",
                  transition: "width 0.4s ease",
                }} />
              </div>
            </div>
          )}
        </div>
        {isMobile && (
          <div style={{
            marginTop: 10,
            width: "100%", height: 6, background: "var(--surface-sunken)",
            borderRadius: "var(--radius-full)", overflow: "hidden",
          }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--brand-accent)" }} />
          </div>
        )}
      </div>

      <div style={{ padding: "0 var(--space-6) var(--space-3)" }}>
        {checklist.map((c, i) => (
          <React.Fragment key={c.title}>
            {i > 0 && <RowDivider />}
            <ChecklistRow {...c} />
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
};

const LiveReadiness = ({ events, isMobile, hasEvents }) => {
  return (
    <Card padded={false}>
      <div style={{
        padding: "var(--space-5) var(--space-6) var(--space-4)",
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>
            Match log
          </h2>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {hasEvents ? `${events.length} event${events.length === 1 ? "" : "s"} logged` : "Tap to log goals, cards, substitutions"}
          </span>
        </div>
        {!isMobile && (
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" icon="trophy" size="sm">Goal</Button>
            <Button variant="secondary" icon="flag" size="sm">Card</Button>
            <Button variant="secondary" icon="users" size="sm">Sub</Button>
          </div>
        )}
      </div>

      {!hasEvents ? (
        <div style={{
          padding: "var(--space-7) var(--space-6) var(--space-8)",
          textAlign: "center",
          borderTop: "1px solid var(--border-subtle)",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "var(--surface-sunken)",
            color: "var(--text-tertiary)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto var(--space-3)",
          }}>
            <Icon name="clock" size={22} />
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
            No events logged yet
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 340, margin: "0 auto var(--space-4)" }}>
            The match clock is running. Log a goal or card to start populating the timeline. Logging is optional, you can also just enter the final result.
          </div>
          {isMobile && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <Button variant="primary" icon="plus" size="sm">Log first event</Button>
              <Button variant="secondary" size="sm">Skip to result</Button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
          {events.map((e, i) => (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "auto auto 1fr auto",
              gap: 12, alignItems: "center",
              padding: "12px 24px",
              borderBottom: i < events.length - 1 ? "1px solid var(--border-subtle)" : "none",
            }}>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12, fontWeight: 600,
                color: "var(--text-tertiary)",
                fontVariantNumeric: "tabular-nums",
                width: 32,
              }}>{e.minute}'</span>
              <span style={{
                width: 24, height: 24, borderRadius: "50%",
                background: e.type === "goal" ? "var(--status-success-tint)" : e.type === "card" ? "var(--status-warning-tint)" : "var(--brand-primary-tint)",
                color: e.type === "goal" ? "var(--status-success)" : e.type === "card" ? "var(--status-warning)" : "var(--brand-primary)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name={e.type === "goal" ? "trophy" : e.type === "card" ? "flag" : "users"} size={12} />
              </span>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>{e.player}</span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{e.detail}</span>
              </div>
              <span style={{ fontSize: 12, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                {e.team}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const PostReadiness = ({ result, scorers, standout, isMobile, hasResult = true }) => {
  if (!hasResult) {
    return (
      <Card>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "var(--status-warning-tint)", color: "var(--status-warning)",
            display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}><Icon name="bell" size={17} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
              Match finished, result not recorded yet
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
              Enter the final score to update the league table and unlock the report. This takes about a minute.
            </div>
            <Button variant="primary" icon="edit" size="sm">Enter result</Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padded={false}>
      <div style={{ padding: "var(--space-5) var(--space-6) var(--space-3)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>
            Result summary
          </h2>
          {!isMobile && (
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="secondary" icon="share" size="sm">Share with parents</Button>
              <Button variant="primary" icon="trophy" size="sm" iconRight="arrow">View full report</Button>
            </div>
          )}
        </div>
      </div>

      <div style={{
        padding: "0 var(--space-6) var(--space-5)",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: "var(--space-5)",
      }}>
        <div>
          <SectionLabel>Goal scorers</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {scorers.map(s => (
              <div key={s.name} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px",
                background: "var(--surface-sunken)",
                borderRadius: "var(--radius-md)",
              }}>
                <span style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: "var(--brand-accent-tint)", color: "var(--brand-primary)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700,
                }}>{s.count}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>
                  {s.name}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                  {s.minutes.join("', ")}'
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>Standout
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
              color: "var(--brand-accent)", textTransform: "uppercase",
              marginLeft: 6,
            }}>AI</span>
          </SectionLabel>
          <div style={{
            padding: "12px 14px",
            background: "var(--brand-primary-tint)",
            borderRadius: "var(--radius-md)",
            border: "1px solid color-mix(in oklab, var(--brand-primary) 8%, transparent)",
          }}>
            <div style={{ fontSize: 13.5, color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 8 }}>
              {standout}
            </div>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              Drafted from logged events, edit before sharing.
            </span>
          </div>
        </div>
      </div>

      {isMobile && (
        <div style={{
          padding: "0 var(--space-6) var(--space-5)",
          display: "flex", gap: 8, flexDirection: "column",
        }}>
          <Button variant="primary" icon="trophy" iconRight="arrow" style={{ width: "100%" }}>View full report</Button>
          <Button variant="secondary" icon="share" style={{ width: "100%" }}>Share with parents</Button>
        </div>
      )}
    </Card>
  );
};

window.PreMatchReadiness = PreMatchReadiness;
window.LiveReadiness = LiveReadiness;
window.PostReadiness = PostReadiness;
