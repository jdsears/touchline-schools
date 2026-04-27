/* global React, Icon, Pill, Button, Card, SectionLabel, Crest */

// =====================================================================
// Dashboard — composition v2
//
// Page structure:
//   1. Page header (greeting + date)
//   2. Morning briefing — primary card, refresh action, never dismissable
//   3. Today's [department / schedule / across the school] — calendar + actions
//   4. Role sections, stacked, with role-adaptive section labels
//
// Voice mic + role toggle live in the global chrome, not on this page.
// No page-level CTA strip; per-feature pages own those.
// =====================================================================

const ROLE_SECTION_LABELS = {
  schoolAdmin: "School Admin",
  hod: "Head of Department",
  teacherCurriculum: "Curriculum PE",
  teacherExtraCurricular: "Extra-Curricular",
};

// Role-adaptive Today framing.
const todayLabelFor = (roles) => {
  if (roles.includes("schoolAdmin")) return "Across the school today";
  if (roles.includes("hod"))         return "Today in your department";
  return "Today's schedule";
};

const todayEmptyFor = (roles) => {
  if (roles.includes("schoolAdmin")) return "Nothing scheduled across the school today.";
  if (roles.includes("hod"))         return "Nothing scheduled in your department today.";
  return "Nothing scheduled today.";
};

const formatDate = () => "Tuesday, 28 April 2026";

// ---------------------------------------------------------------------
// Page header — greeting + date + Customise. No CTA strip.
// ---------------------------------------------------------------------
const PageHeader = ({ name = "John" }) => (
  <div style={{
    display: "flex", alignItems: "baseline", justifyContent: "space-between",
    gap: 16, marginBottom: 16,
  }}>
    <div style={{ minWidth: 0 }}>
      <h1 style={{
        fontFamily: "var(--font-display)",
        fontSize: 26, fontWeight: 700, letterSpacing: "-0.015em",
        color: "var(--text-primary)", margin: 0, lineHeight: 1.15,
      }}>Good morning, {name}.</h1>
      <p style={{
        fontSize: 13.5, color: "var(--text-tertiary)", margin: "4px 0 0",
      }}>{formatDate()}</p>
    </div>
    <Button variant="ghost" icon="settings" size="sm">Customise</Button>
  </div>
);

// ---------------------------------------------------------------------
// Morning briefing — primary card. Refresh, not dismiss.
// ---------------------------------------------------------------------
const BriefingCard = ({ briefing, state = "ready", lastRefreshed = "08:14", priorityAction }) => {
  const isQuiet = state === "quiet";
  return (
    <Card padded={false} style={{ marginBottom: 18, position: "relative", overflow: "hidden" }}>
      {/* Accent rail */}
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: 3,
        background: "var(--brand-accent)",
      }} />
      <div style={{ padding: "16px 18px 16px 22px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          marginBottom: 10,
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: "50%",
            background: "var(--brand-primary)", color: "var(--brand-accent)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}><Icon name="sparkle" size={11} /></span>
          <span style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--brand-primary)",
          }}>Morning briefing</span>
          <span style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em",
            background: "var(--brand-primary)", color: "var(--brand-accent)",
            padding: "1px 6px", borderRadius: "var(--radius-full)",
          }}>AI</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
            Refreshed {lastRefreshed}
          </span>
          <button aria-label="Refresh briefing" style={{
            background: "transparent", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)", padding: "4px 8px",
            display: "inline-flex", alignItems: "center", gap: 5,
            cursor: "pointer", color: "var(--text-secondary)", fontSize: 11.5, fontWeight: 600,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5" />
            </svg>
            Refresh
          </button>
        </div>

        {state === "loading" ? (
          <>
            <div style={{ height: 14, marginBottom: 6, borderRadius: 4, background: "linear-gradient(90deg, transparent, rgba(15,30,61,0.06), transparent)", backgroundSize: "400px 100%", animation: "moonbootsShimmer 1.6s linear infinite" }} />
            <div style={{ height: 14, width: "78%", borderRadius: 4, background: "linear-gradient(90deg, transparent, rgba(15,30,61,0.06), transparent)", backgroundSize: "400px 100%", animation: "moonbootsShimmer 1.6s linear infinite" }} />
          </>
        ) : isQuiet ? (
          <>
            <p style={{
              fontSize: 14, color: "var(--text-primary)", margin: 0, lineHeight: 1.55,
              fontWeight: 500,
            }}>All quiet today. Nothing flagged across your department, no fixtures or assessments outstanding.</p>
            <div style={{
              marginTop: 10, fontSize: 12.5, color: "var(--text-secondary)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Icon name="check" size={14} style={{ color: "var(--status-success)" }} />
              <span>A good day to plan ahead — review next week's fixtures or moderate any pending grades.</span>
            </div>
          </>
        ) : (
          <>
            <p style={{
              fontSize: 14.5, color: "var(--text-primary)", margin: 0, lineHeight: 1.55,
            }}>{briefing}</p>
            {priorityAction && (
              <div style={{
                marginTop: 12, paddingTop: 12,
                borderTop: "1px dashed var(--border-subtle)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: "var(--text-tertiary)",
                }}>Priority</span>
                <span style={{
                  fontSize: 13, color: "var(--text-primary)", fontWeight: 500,
                  flex: 1, minWidth: 0,
                }}>{priorityAction.label}</span>
                <Button variant="primary" size="sm" iconRight="chevron">{priorityAction.cta}</Button>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------
// Today: calendar strip + actions (composition unchanged from v1).
// ---------------------------------------------------------------------
const ROLE_DOTS = {
  hod: "var(--text-secondary)",
  teacherCurriculum: "var(--status-info)",
  teacherExtraCurricular: "var(--brand-accent)",
  schoolAdmin: "var(--brand-primary)",
};

const ROLE_TAG = {
  hod: "HoD",
  teacherCurriculum: "Curriculum",
  teacherExtraCurricular: "Extra",
  schoolAdmin: "Admin",
};

const CalendarStrip = ({ events }) => {
  const start = 8, end = 18;
  const hours = end - start;
  const hourW = 80;
  const totalW = hours * hourW;
  const nowHour = 9.55;
  const nowX = (nowHour - start) * hourW;

  return (
    <div style={{ position: "relative" }}>
      <div style={{
        display: "flex", borderBottom: "1px solid var(--border-subtle)",
        paddingBottom: 6, marginBottom: 10,
      }}>
        {Array.from({ length: hours + 1 }).map((_, i) => (
          <div key={i} style={{
            width: hourW, fontSize: 10.5, fontFamily: "var(--font-mono)",
            color: "var(--text-tertiary)", letterSpacing: "0.02em",
          }}>{String(start + i).padStart(2, "0")}:00</div>
        ))}
      </div>
      <div style={{ position: "relative", height: 56, width: totalW }}>
        {Array.from({ length: hours }).map((_, i) => (
          <div key={i} style={{ position: "absolute", left: i * hourW, top: 0, bottom: 0, width: 1, background: "var(--border-subtle)" }} />
        ))}
        <div style={{ position: "absolute", left: nowX, top: -6, bottom: -6, width: 2, background: "var(--status-error)", zIndex: 2 }}>
          <div style={{
            position: "absolute", top: -8, left: -4,
            width: 10, height: 10, borderRadius: "50%",
            background: "var(--status-error)",
            boxShadow: "0 0 0 3px color-mix(in oklab, var(--status-error) 18%, transparent)",
          }} />
          <div style={{
            position: "absolute", top: -22, left: -16,
            fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
            color: "var(--status-error)", whiteSpace: "nowrap",
            fontFamily: "var(--font-mono)",
          }}>NOW · 09:33</div>
        </div>
        {events.map((ev, i) => {
          const left = (ev.start - start) * hourW;
          const width = (ev.end - ev.start) * hourW;
          const dotColor = ROLE_DOTS[ev.role] || "var(--text-secondary)";
          const isPast = ev.end <= nowHour;
          return (
            <div key={i} style={{
              position: "absolute", left, top: ev.lane * 28, width: width - 6, height: 26,
              borderRadius: "var(--radius-sm)",
              background: isPast ? "var(--surface-sunken)" : "var(--surface-card)",
              border: `1px solid ${isPast ? "var(--border-subtle)" : "var(--border-default)"}`,
              borderLeft: `3px solid ${dotColor}`,
              padding: "3px 8px",
              display: "flex", alignItems: "center", gap: 6,
              opacity: isPast ? 0.55 : 1,
              fontSize: 11.5, color: "var(--text-primary)", fontWeight: 600,
              overflow: "hidden",
            }}>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.label}</span>
              {ev.live && (
                <Pill tone="live" live style={{ marginLeft: "auto", fontSize: 10, padding: "1px 6px" }}>LIVE</Pill>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ActionRow = ({ action }) => {
  const tone = action.urgency === "high" ? "error" : action.urgency === "medium" ? "warning" : "neutral";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px",
      borderTop: "1px solid var(--border-subtle)",
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: ROLE_DOTS[action.role] || "var(--text-tertiary)",
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em",
        textTransform: "uppercase", color: "var(--text-tertiary)",
        width: 64, flexShrink: 0,
      }}>{ROLE_TAG[action.role]}</span>
      <span style={{
        fontSize: 13.5, color: "var(--text-primary)",
        flex: 1, minWidth: 0,
      }}>
        <strong style={{ fontWeight: 600 }}>{action.verb}</strong>
        <span style={{ color: "var(--text-secondary)" }}> · {action.subject}</span>
      </span>
      {action.deadline && <Pill tone={tone} dot>{action.deadline}</Pill>}
      <Button variant="secondary" size="sm" iconRight="chevron">{action.cta}</Button>
    </div>
  );
};

const TodayHero = ({ events, actions, isMobile, state = "ready", roles = [], showLegend = true }) => {
  const heading = todayLabelFor(roles);
  if (state === "loading") {
    return (
      <Card style={{ marginBottom: 24, padding: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ width: 220, height: 12, background: "var(--surface-sunken)", borderRadius: 4, marginBottom: 14 }} />
          <div style={{ height: 56, background: "linear-gradient(90deg, transparent, rgba(15,30,61,0.06), transparent)", backgroundSize: "400px 100%", animation: "moonbootsShimmer 1.6s linear infinite", borderRadius: 4 }} />
        </div>
        {[0,1,2].map(i => (
          <div key={i} style={{ padding: "14px 16px", borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
            <div style={{ width: "60%", height: 12, background: "var(--surface-sunken)", borderRadius: 4 }} />
          </div>
        ))}
      </Card>
    );
  }

  if (state === "empty") {
    return (
      <Card style={{ marginBottom: 24, padding: 32, textAlign: "center" }}>
        <div style={{
          width: 44, height: 44, borderRadius: "var(--radius-full)",
          background: "var(--brand-accent-tint)", color: "var(--brand-primary)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px",
        }}><Icon name="calendar" size={20} /></div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, margin: "0 0 6px", color: "var(--text-primary)" }}>
          {todayEmptyFor(roles)}
        </h3>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 auto", maxWidth: 360 }}>
          When you have lessons, fixtures or training scheduled, they'll appear here as a timeline.
        </p>
        <div style={{ marginTop: 16, display: "inline-flex", gap: 8 }}>
          <Button variant="primary" size="sm" icon="plus">Schedule a fixture</Button>
          <Button variant="secondary" size="sm" icon="calendar">Plan a lesson</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ marginBottom: 24, padding: 0 }}>
      <div style={{ padding: "16px 20px 20px" }}>
        <div style={{
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          marginBottom: 14, flexWrap: "wrap", gap: 10,
        }}>
          <SectionLabel style={{ marginBottom: 0 }}>{heading}</SectionLabel>
          {showLegend && roles.length > 1 && (
            <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 11, color: "var(--text-tertiary)" }}>
              {roles.map(r => (
                <span key={r} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: ROLE_DOTS[r] }} />
                  {ROLE_TAG[r]}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ overflowX: "auto", marginRight: -20, paddingRight: 20 }}>
          <CalendarStrip events={events} />
        </div>
      </div>
      <div>
        <div style={{
          padding: "12px 16px",
          background: "var(--surface-sunken)",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
            textTransform: "uppercase", color: "var(--text-secondary)",
          }}>Needs your attention · {actions.length}</span>
          <a style={{ fontSize: 12, color: "var(--brand-primary)", fontWeight: 600, textDecoration: "none" }}>View all</a>
        </div>
        {actions.map((a, i) => <ActionRow key={i} action={a} />)}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------
// Section wrapper for role groups
// ---------------------------------------------------------------------
const RoleSection = ({ roleId, showLabel, children, action }) => (
  <div style={{ marginBottom: 32 }}>
    {showLabel && (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: ROLE_DOTS[roleId] || "var(--text-tertiary)",
          }} />
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--text-secondary)",
            margin: 0,
          }}>{ROLE_SECTION_LABELS[roleId]}</h2>
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

window.PageHeader = PageHeader;
window.BriefingCard = BriefingCard;
window.TodayHero = TodayHero;
window.RoleSection = RoleSection;
window.ROLE_DOTS = ROLE_DOTS;
window.ROLE_TAG = ROLE_TAG;
window.todayLabelFor = todayLabelFor;
