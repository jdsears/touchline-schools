/* global React, Icon, Crest, Pill, Button, Card, SectionLabel,
   MatchHeader, PreMatchReadiness, LiveReadiness, PostReadiness,
   Sidebar, TopBar, TabStrip */

// AI feature shortcut cards: now carry previews of what they offer,
// per brief section 4.

const AIShortcut = ({ icon, iconBg, iconFg, label, preview, meta, accent }) => (
  <div style={{
    display: "flex", flexDirection: "column", gap: 10,
    padding: "16px 18px",
    background: "var(--surface-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-sm)",
    cursor: "pointer",
    minHeight: 132,
    position: "relative",
  }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          width: 30, height: 30, borderRadius: "var(--radius-md)",
          background: iconBg, color: iconFg,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}><Icon name={icon} size={16} /></span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
      </div>
      {accent && (
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
          color: "var(--brand-accent)", textTransform: "uppercase",
        }}>{accent}</span>
      )}
    </div>
    <div style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45 }}>
      {preview}
    </div>
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      paddingTop: 8,
      borderTop: "1px dashed var(--border-subtle)",
    }}>
      <span style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>{meta}</span>
      <Icon name="chevron" size={14} style={{ color: "var(--text-tertiary)" }} />
    </div>
  </div>
);

// Compact opposition + conditions panel (sidebar of the Overview).
const OppositionPanel = ({ opponent, lastMeetings, conditions, isMobile }) => (
  <Card padded={false}>
    <div style={{ padding: "var(--space-5) var(--space-6) var(--space-4)" }}>
      <SectionLabel>Opposition</SectionLabel>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Crest initials={opponent.initials} size={40} tone="muted" todo={opponent.todoCrest} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            {opponent.name}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {opponent.note}
          </div>
        </div>
      </div>
    </div>

    <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "var(--space-4) var(--space-6)" }}>
      <SectionLabel>Last meetings</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {lastMeetings.map((m, i) => (
          <div key={i} style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            alignItems: "center", gap: 10,
            fontSize: 12.5,
          }}>
            <span style={{ color: "var(--text-secondary)" }}>{m.date}</span>
            <span style={{
              fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums",
              color: "var(--text-primary)", fontWeight: 600,
            }}>{m.score}</span>
            <Pill tone={m.outcome === "W" ? "success" : m.outcome === "L" ? "error" : "neutral"} style={{ padding: "1px 7px", fontSize: 11 }}>
              {m.outcome}
            </Pill>
          </div>
        ))}
      </div>
    </div>

    {conditions && (
      <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "var(--space-4) var(--space-6) var(--space-5)" }}>
        <SectionLabel>Conditions at kick-off</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {conditions.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--text-tertiary)" }}>
                <Icon name={c.icon} size={15} />
              </span>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{c.value}</span>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{c.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </Card>
);

// The Overview page itself.
const MatchOverview = ({
  state = "pre",
  variant = "default", // default | empty | loading | live-no-events | post-no-result
  isMobile = false,
  schoolTheme,
}) => {
  const home = {
    name: "Ashworth Park Academy",
    short: "Ashworth Park",
    initials: "AP",
    isUs: true,
    record: "W3 D1 L1",
  };
  const away = {
    name: "Whitfield High School",
    short: "Whitfield",
    initials: "WH",
    record: "W2 D2 L2",
    todoCrest: variant !== "empty",
  };
  const fixture = {
    kickoffTime: "14:00",
    kickoffDate: "Sat, 2 May",
    kickoffFull: "Saturday 2 May 2026, 14:00",
    venue: "Ashworth Park, North Pitch",
    homeAway: "home",
    competition: "U13 District League · Round 9",
  };
  const weather = { icon: "cloud", text: "Cloudy, 12°C, light wind" };

  // Pre-match checklist
  const preChecklist = [
    {
      state: "done",
      title: "Squad confirmed",
      meta: "2 days ago",
      detail: "16 players selected, 5 on the bench. 1 absentee logged.",
      action: <Button variant="ghost" icon="eye" size="sm" style={{ color: "var(--text-secondary)" }}>View squad</Button>,
    },
    {
      state: "done",
      title: "Formation set",
      meta: "Yesterday",
      detail: "3-2-3 primary, 2-3-3 backup. Locked from Match Prep.",
      action: <Button variant="ghost" icon="formation" size="sm" style={{ color: "var(--text-secondary)" }}>Match Prep</Button>,
    },
    {
      state: "done",
      title: "Kit chosen",
      meta: "Yesterday",
      detail: "Home strip: navy and gold. Goalkeeper: red.",
    },
    {
      state: "pending",
      title: "Parents notified",
      meta: "Sends 24h before kick-off",
      detail: "Auto-send queued for tomorrow at 14:00. 12 of 16 parents have read the squad list.",
      action: <Button variant="secondary" icon="bell" size="sm">Send now</Button>,
    },
    {
      state: "pending",
      title: "Tactical briefing reviewed",
      meta: "Optional",
      detail: "AI briefing ready. Last opened: never.",
      action: <Button variant="secondary" icon="sparkle" size="sm">Open briefing</Button>,
    },
  ];

  // Live state events (used when state==="live" and variant!="live-no-events")
  const liveEvents = variant === "live-no-events" ? [] : [
    { minute: 12, type: "goal", team: "Home", player: "Jamie Okonkwo", detail: "From a corner, header." },
    { minute: 28, type: "card", team: "Away", player: "T. Whitlock (yellow)", detail: "Late tackle on Marsh." },
    { minute: 41, type: "goal", team: "Away", player: "L. Reeves", detail: "Counter-attack, 1v1 finish." },
    { minute: 55, type: "sub", team: "Home", player: "Sub: Idris in for Marsh", detail: "Fitness rotation." },
    { minute: 67, type: "goal", team: "Home", player: "Amelia Whitehead", detail: "Long-range, top corner." },
  ];

  const score = variant === "live-no-events" ? null : { home: 2, away: 1 };

  // Determine which readiness panel to show
  let panel = null;
  if (state === "pre") panel = <PreMatchReadiness checklist={preChecklist} isMobile={isMobile} />;
  else if (state === "live") panel = <LiveReadiness events={liveEvents} isMobile={isMobile} hasEvents={liveEvents.length > 0} />;
  else if (state === "post") {
    panel = (
      <PostReadiness
        hasResult={variant !== "post-no-result"}
        result={{ home: 3, away: 1, outcome: "W" }}
        scorers={[
          { name: "Jamie Okonkwo", count: 2, minutes: [12, 78] },
          { name: "Amelia Whitehead", count: 1, minutes: [67] },
        ]}
        standout="Okonkwo's late goal sealed it after a tense second half. Defence held firm against three corners in the final ten minutes. Player of the match nominated by both coaches."
        isMobile={isMobile}
      />
    );
  }

  // Headline meta
  const headerProps = {
    state,
    fixture,
    home,
    away,
    score,
    events: liveEvents,
    liveClock: 67,
    countdown: "3 days",
    weather: state === "pre" ? weather : null,
    lastMeeting: state === "pre" ? "Lost 2–1, October 2025" : null,
    liveHasEvents: liveEvents.length > 0,
    postHasResult: variant !== "post-no-result",
    isMobile,
  };

  // AI shortcuts content per state
  const aiShortcuts = state === "pre" ? [
    {
      icon: "sparkle", iconBg: "var(--status-success-tint)", iconFg: "var(--status-success)",
      label: "Tactical briefing", accent: "AI",
      preview: "Whitfield press high through midfield. Recommend exploiting space behind their full-backs with quick switches.",
      meta: "Updated 2 hours ago · 4 min read",
    },
    {
      icon: "chat", iconBg: "var(--brand-accent-tint)", iconFg: "var(--brand-primary)",
      label: "Chat about this match", accent: "AI",
      preview: "Ask about set-piece patterns, opposition weaknesses, or substitution timing. Knows your squad and Whitfield's last 6 games.",
      meta: "Last asked: yesterday",
    },
    {
      icon: "videos", iconBg: "var(--brand-primary-tint)", iconFg: "var(--brand-primary)",
      label: "Video clips",
      preview: "2 clips ready: Whitfield's last home win, and your training session focused on counter-press.",
      meta: "2 clips · 7 min total",
    },
  ] : state === "live" ? [
    {
      icon: "sparkle", iconBg: "var(--status-success-tint)", iconFg: "var(--status-success)",
      label: "Live tactical nudges", accent: "AI",
      preview: "Whitfield are dropping deeper. Consider pushing the right wing-back higher, your formation supports it.",
      meta: "Updates every 5 minutes",
    },
    {
      icon: "chat", iconBg: "var(--brand-accent-tint)", iconFg: "var(--brand-primary)",
      label: "Ask the assistant", accent: "AI",
      preview: "Quick questions on subs, formation tweaks, or what to say at half-time. Voice input supported on mobile.",
      meta: "Half-time in 13 minutes",
    },
    {
      icon: "videos", iconBg: "var(--brand-primary-tint)", iconFg: "var(--brand-primary)",
      label: "Capture highlight",
      preview: "Mark a moment to capture from the pitch-side camera. Auto-clips the surrounding 30 seconds.",
      meta: "Camera linked",
    },
  ] : [
    {
      icon: "sparkle", iconBg: "var(--status-success-tint)", iconFg: "var(--status-success)",
      label: "Match report draft", accent: "AI",
      preview: "Draft prepared from logged events: opening narrative, key moments, player ratings. Ready to review and publish.",
      meta: "320 words · 2 min read",
    },
    {
      icon: "chat", iconBg: "var(--brand-accent-tint)", iconFg: "var(--brand-primary)",
      label: "Debrief notes", accent: "AI",
      preview: "Three discussion prompts for Monday's training, drawn from what happened on the pitch.",
      meta: "Draft saved",
    },
    {
      icon: "videos", iconBg: "var(--brand-primary-tint)", iconFg: "var(--brand-primary)",
      label: "Highlights reel",
      preview: "Auto-edited 90-second reel of the 3 logged goals plus 2 key defensive moments. Approve before sharing.",
      meta: "1:32 · awaiting approval",
    },
  ];

  // Loading skeleton mode
  if (variant === "loading") {
    return <LoadingState isMobile={isMobile} />;
  }

  if (variant === "empty") {
    return <EmptyFixtureState isMobile={isMobile} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <MatchHeader {...headerProps} />

      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 320px",
        gap: "var(--space-5)",
        alignItems: "start",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", minWidth: 0 }}>
          {panel}

          <div>
            <SectionLabel>{state === "pre" ? "Prepare" : state === "live" ? "On the pitch" : "After the match"}</SectionLabel>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
              gap: "var(--space-3)",
            }}>
              {aiShortcuts.map(s => <AIShortcut key={s.label} {...s} />)}
            </div>
          </div>
        </div>

        <OppositionPanel
          opponent={{
            name: "Whitfield High School",
            initials: "WH",
            note: "U13 boys, 4th in district. Strong counter-attack.",
            todoCrest: true,
          }}
          lastMeetings={[
            { date: "Oct 2025 (away)", score: "1 – 2", outcome: "L" },
            { date: "Mar 2025 (home)", score: "3 – 3", outcome: "D" },
            { date: "Nov 2024 (away)", score: "2 – 0", outcome: "W" },
          ]}
          conditions={state === "pre" ? [
            { icon: "cloud", value: "Cloudy", label: "Forecast" },
            { icon: "sun",   value: "12°C",   label: "Temp at KO" },
            { icon: "wind",  value: "8 mph",  label: "Wind, SW" },
            { icon: "droplet", value: "Dry",   label: "Pitch" },
          ] : null}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
};

// Loading state: skeletons for the header and panels.
const SkeletonBlock = ({ w = "100%", h = 12, r = 4, style }) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: "linear-gradient(90deg, var(--surface-sunken) 0%, color-mix(in oklab, var(--surface-sunken) 60%, white) 50%, var(--surface-sunken) 100%)",
    backgroundSize: "800px 100%",
    animation: "moonbootsShimmer 1.6s linear infinite",
    ...style,
  }} />
);

const LoadingState = ({ isMobile }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
    <div style={{
      background: "var(--brand-primary)",
      borderRadius: "var(--radius-xl)",
      padding: isMobile ? "20px 16px" : "28px 24px",
      minHeight: isMobile ? 220 : 240,
      display: "flex", flexDirection: "column", gap: 18,
    }}>
      <div style={{ display: "flex", gap: 8 }}>
        <SkeletonBlock w={120} h={22} r={999} style={{ background: "rgba(255,255,255,0.12)" }} />
        <SkeletonBlock w={140} h={14} r={4} style={{ background: "rgba(255,255,255,0.08)" }} />
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr 1fr" : "1fr auto 1fr",
        gap: 24, alignItems: "center",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: isMobile ? "center" : "flex-end", gap: 10 }}>
          <SkeletonBlock w={isMobile ? 44 : 56} h={isMobile ? 44 : 56} r={6} style={{ background: "rgba(255,255,255,0.12)" }} />
          <SkeletonBlock w={100} h={14} style={{ background: "rgba(255,255,255,0.10)" }} />
        </div>
        <SkeletonBlock w={isMobile ? 80 : 120} h={isMobile ? 36 : 48} r={6} style={{ background: "rgba(255,255,255,0.10)" }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: isMobile ? "center" : "flex-start", gap: 10 }}>
          <SkeletonBlock w={isMobile ? 44 : 56} h={isMobile ? 44 : 56} r={6} style={{ background: "rgba(255,255,255,0.12)" }} />
          <SkeletonBlock w={100} h={14} style={{ background: "rgba(255,255,255,0.10)" }} />
        </div>
      </div>
    </div>
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 320px",
      gap: "var(--space-5)",
    }}>
      <Card>
        <SkeletonBlock w={180} h={16} style={{ marginBottom: 16 }} />
        {[0,1,2,3].map(i => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
            <SkeletonBlock w={28} h={28} r={999} />
            <div style={{ flex: 1 }}>
              <SkeletonBlock w="40%" h={14} style={{ marginBottom: 6 }} />
              <SkeletonBlock w="70%" h={12} />
            </div>
          </div>
        ))}
      </Card>
      <Card>
        <SkeletonBlock w={120} h={12} style={{ marginBottom: 14 }} />
        <SkeletonBlock w="100%" h={48} r={6} style={{ marginBottom: 16 }} />
        <SkeletonBlock w={100} h={12} style={{ marginBottom: 8 }} />
        <SkeletonBlock w="100%" h={12} style={{ marginBottom: 6 }} />
        <SkeletonBlock w="80%" h={12} />
      </Card>
    </div>
  </div>
);

// Empty state for a brand-new fixture nothing scheduled.
const EmptyFixtureState = ({ isMobile }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
    <div style={{
      background: "var(--brand-primary)",
      borderRadius: "var(--radius-xl)",
      padding: isMobile ? "24px 18px 26px" : "32px 28px",
      color: "var(--text-on-dark)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ height: 3, background: "var(--brand-accent)", position: "absolute", top: 0, left: 0, right: 0 }} />
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: 18 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 12,
          background: "rgba(255,255,255,0.08)", color: "var(--brand-accent)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          border: "1px solid rgba(255,255,255,0.16)",
        }}>
          <Icon name="calendar" size={24} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 4 }}>
            No fixture scheduled yet
          </div>
          <div style={{ fontSize: 14, color: "var(--text-on-dark-secondary)", lineHeight: 1.5, maxWidth: 520 }}>
            Year 7 Boys Football has no upcoming match. Add one to start the readiness checklist, or pick from the league fixture list.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row", width: isMobile ? "100%" : "auto" }}>
          <Button variant="accent" icon="plus" style={isMobile ? { width: "100%" } : null}>Add fixture</Button>
          <Button variant="ghost" icon="table" style={{ color: "var(--text-on-dark)", border: "1px solid rgba(255,255,255,0.18)", ...(isMobile ? { width: "100%" } : {}) }}>
            Browse league
          </Button>
        </div>
      </div>
    </div>

    <Card>
      <SectionLabel>While you wait</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
        {[
          { icon: "users", title: "Confirm squad", body: "16 players ready, 1 needs medical clearance." },
          { icon: "formation", title: "Set default formation", body: "Saves time on every match prep." },
          { icon: "sparkle", title: "Try the AI assistant", body: "Ask about training drills or season planning." },
        ].map(t => (
          <div key={t.title} style={{
            padding: 14, borderRadius: "var(--radius-md)",
            background: "var(--surface-sunken)",
            border: "1px solid var(--border-subtle)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Icon name={t.icon} size={15} style={{ color: "var(--brand-primary)" }} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>{t.title}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.45 }}>{t.body}</div>
          </div>
        ))}
      </div>
    </Card>
  </div>
);

window.MatchOverview = MatchOverview;
window.AIShortcut = AIShortcut;
window.OppositionPanel = OppositionPanel;
