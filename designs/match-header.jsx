/* global React, Icon, Crest, Pill, Button */

// MatchHeader: the centrepiece of Match Overview.
// Carries all three lifecycle states: pre-match, live, post-match.
// Live state degrades gracefully when no events have been logged.
//
// Props:
//  state:    "pre" | "live" | "post"
//  liveHasEvents: boolean (when state==="live"; if false, score reads "Not yet logged")
//  postHasResult: boolean (when state==="post"; if false, "Result not recorded")
//  fixture:  { kickoff: Date, venue, homeAway: "home"|"away", competition, conditions }
//  home, away: { name, short, initials, crestSrc?, todoCrest?, record?: "W2 D1 L1" }
//  score:    { home, away }
//  events:   [{ minute, type: "goal"|"card"|"sub", team: "home"|"away", player }]
//  liveClock: number (minutes elapsed)

const MatchHeader = ({
  state = "pre",
  liveHasEvents = false,
  postHasResult = true,
  fixture,
  home,
  away,
  score,
  events = [],
  liveClock = 0,
  countdown = "3 days",
  lastMeeting,
  weather,
  isMobile = false,
}) => {
  const navy = "var(--brand-primary)";
  const onNavy = "var(--text-on-dark)";
  const onNavyDim = "var(--text-on-dark-secondary)";

  // Status pill content per state
  const statusPill = (() => {
    if (state === "pre") {
      return <Pill tone="accent" dot>Kick-off in {countdown}</Pill>;
    }
    if (state === "live") {
      return <Pill tone="live" live>Live · {liveClock}'</Pill>;
    }
    if (state === "post") {
      if (!postHasResult) return <Pill tone="warning" dot>Result not recorded</Pill>;
      const w = score.home > score.away ? (home.isUs ? "W" : "L") : score.home < score.away ? (home.isUs ? "L" : "W") : "D";
      const tone = w === "W" ? "success" : w === "L" ? "error" : "neutral";
      const label = w === "W" ? "Win" : w === "L" ? "Loss" : "Draw";
      return <Pill tone={tone} dot>{label}</Pill>;
    }
  })();

  // Score / status row at the centre
  const ScoreCluster = () => {
    if (state === "pre") {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          minWidth: isMobile ? 80 : 140,
        }}>
          <span style={{ fontSize: 11, color: onNavyDim, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
            Kick-off
          </span>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: isMobile ? 28 : 36, fontWeight: 600, color: onNavy,
            lineHeight: 1, letterSpacing: "-0.02em",
          }}>
            {fixture.kickoffTime}
          </span>
          <span style={{ fontSize: 12, color: onNavyDim }}>
            {fixture.kickoffDate}
          </span>
        </div>
      );
    }

    if (state === "live" && !liveHasEvents) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          minWidth: isMobile ? 100 : 160,
        }}>
          <span style={{ fontSize: 11, color: onNavyDim, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
            Score
          </span>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: isMobile ? 18 : 22, fontWeight: 500,
            color: onNavyDim, lineHeight: 1.1, fontStyle: "italic",
          }}>
            Not yet logged
          </span>
          <span style={{ fontSize: 12, color: onNavyDim }}>
            {liveClock}' elapsed
          </span>
        </div>
      );
    }

    // Live with events, OR post with result
    const showing = state === "post" && !postHasResult ? null : score;
    if (!showing) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          minWidth: isMobile ? 100 : 160,
        }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: isMobile ? 22 : 28, fontWeight: 500,
            color: onNavyDim, fontStyle: "italic",
          }}>
            No result
          </span>
        </div>
      );
    }

    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? 12 : 18,
        minWidth: isMobile ? 100 : 160,
      }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: isMobile ? 40 : 56, fontWeight: 600,
          color: onNavy, lineHeight: 1, letterSpacing: "-0.04em",
          fontVariantNumeric: "tabular-nums",
        }}>{showing.home}</span>
        <span style={{
          fontSize: isMobile ? 18 : 22, color: onNavyDim, fontWeight: 400, lineHeight: 1,
        }}>:</span>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: isMobile ? 40 : 56, fontWeight: 600,
          color: onNavy, lineHeight: 1, letterSpacing: "-0.04em",
          fontVariantNumeric: "tabular-nums",
        }}>{showing.away}</span>
      </div>
    );
  };

  // Team block (crest + names + record)
  const TeamBlock = ({ team, side }) => (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: side === "home" ? (isMobile ? "center" : "flex-end") : (isMobile ? "center" : "flex-start"),
      gap: 8, flex: 1, minWidth: 0,
      textAlign: isMobile ? "center" : (side === "home" ? "right" : "left"),
    }}>
      <Crest
        initials={team.initials}
        src={team.crestSrc}
        size={isMobile ? 44 : 56}
        tone={team.isUs ? "primary" : "muted"}
        todo={team.todoCrest}
        title={team.todoCrest ? `${team.name} (crest needed)` : team.name}
        style={team.isUs ? {
          background: "rgba(255,255,255,0.08)",
          color: "var(--brand-accent)",
          border: "1px solid rgba(255,255,255,0.18)",
        } : team.todoCrest ? {
          background: "rgba(255,255,255,0.04)",
          color: onNavyDim,
          borderStyle: "dashed",
          borderColor: "rgba(255,255,255,0.32)",
        } : {
          background: "rgba(255,255,255,0.92)",
          color: "var(--brand-primary)",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, maxWidth: "100%" }}>
        <span style={{
          fontSize: isMobile ? 14 : 16, fontWeight: 600, color: onNavy,
          letterSpacing: "-0.01em", lineHeight: 1.2,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{team.short || team.name}</span>
        {team.record && (
          <span style={{ fontSize: 11, color: onNavyDim, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
            {team.record}
          </span>
        )}
        {team.todoCrest && (
          <span style={{ fontSize: 10.5, color: "var(--brand-accent)", fontWeight: 600, marginTop: 2 }}>
            Add crest
          </span>
        )}
      </div>
    </div>
  );

  // Meta row (date, venue, conditions, last meeting)
  const meta = [];
  if (fixture.kickoffDate && state === "pre") meta.push({ icon: "calendar", text: fixture.kickoffFull });
  if (fixture.venue) meta.push({ icon: "pin", text: fixture.venue });
  if (fixture.homeAway) meta.push({ icon: "flag", text: fixture.homeAway === "home" ? "Home fixture" : "Away fixture" });
  if (weather) meta.push({ icon: weather.icon || "cloud", text: weather.text });
  if (lastMeeting) meta.push({ icon: "clock", text: `Last meeting: ${lastMeeting}` });

  return (
    <div style={{
      background: navy,
      borderRadius: "var(--radius-xl)",
      overflow: "hidden",
      position: "relative",
      boxShadow: "var(--shadow-md)",
      color: onNavy,
    }}>
      {/* Subtle gold accent bar at top */}
      <div style={{ height: 3, background: "var(--brand-accent)" }} />

      {/* Top row: status, competition, action */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "14px 16px 0" : "18px 24px 0",
        gap: 12, flexWrap: isMobile ? "wrap" : "nowrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {statusPill}
          {fixture.competition && (
            <span style={{ fontSize: 12, color: onNavyDim, fontWeight: 500 }}>
              {fixture.competition}
            </span>
          )}
        </div>
        {!isMobile && state === "pre" && (
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" icon="edit" size="sm" style={{ color: onNavyDim, background: "transparent", border: "1px solid rgba(255,255,255,0.18)" }}>
              Edit fixture
            </Button>
          </div>
        )}
        {!isMobile && state === "live" && (
          <Button variant="accent" icon="plus" size="sm">
            {liveHasEvents ? "Log event" : "Log first event"}
          </Button>
        )}
        {!isMobile && state === "post" && (
          <Button variant="accent" icon={postHasResult ? "trophy" : "edit"} size="sm">
            {postHasResult ? "View report" : "Enter result"}
          </Button>
        )}
      </div>

      {/* Centrepiece: home vs away */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr auto 1fr",
        alignItems: "center",
        gap: isMobile ? 16 : 24,
        padding: isMobile ? "16px 16px 4px" : "20px 24px 8px",
      }}>
        {!isMobile && <TeamBlock team={home} side="home" />}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <TeamBlock team={home} side="home" />
            <ScoreCluster />
            <TeamBlock team={away} side="away" />
          </div>
        )}
        {!isMobile && <ScoreCluster />}
        {!isMobile && <TeamBlock team={away} side="away" />}
      </div>

      {/* Meta row */}
      {meta.length > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: isMobile ? 10 : 16,
          padding: isMobile ? "12px 16px 14px" : "16px 24px 18px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          marginTop: 4,
        }}>
          {meta.map((m, i) => (
            <div key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12.5, color: onNavyDim, fontWeight: 500,
            }}>
              <Icon name={m.icon} size={14} style={{ color: onNavyDim, flexShrink: 0 }} />
              <span>{m.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Mobile-only action footer */}
      {isMobile && (
        <div style={{
          padding: "0 16px 16px",
          borderTop: meta.length === 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
        }}>
          {state === "pre" && (
            <Button variant="accent" icon="edit" size="md" style={{ width: "100%" }}>
              Edit fixture
            </Button>
          )}
          {state === "live" && (
            <Button variant="accent" icon="plus" size="md" style={{ width: "100%" }}>
              {liveHasEvents ? "Log event" : "Log first event"}
            </Button>
          )}
          {state === "post" && (
            <Button variant="accent" icon={postHasResult ? "trophy" : "edit"} size="md" style={{ width: "100%" }}>
              {postHasResult ? "View report" : "Enter result"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

window.MatchHeader = MatchHeader;
