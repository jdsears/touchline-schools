/* global React, Icon, Pill, Button, Card, SectionLabel, Crest */

// =====================================================================
// Dashboard sections — role-specific content blocks (v2).
//
// Changes from v1:
//   - Reporting Windows card added to HoD section
//   - Moderation differentiates agreement (inline Approve) vs disagreement (Review only)
//   - Curriculum reverted to live-app minimalism: Today + My Classes + My Teams
//   - Weather strip drops the Reschedule CTA
// =====================================================================

// ---------------------------------------------------------------------
// HoD section
// ---------------------------------------------------------------------
const Metric = ({ label, value, delta, deltaTone = "neutral", sub }) => {
  const deltaColor = deltaTone === "positive" ? "var(--status-success)"
    : deltaTone === "negative" ? "var(--status-error)"
    : "var(--text-tertiary)";
  return (
    <div style={{
      flex: 1, minWidth: 0,
      padding: "14px 16px",
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em",
        textTransform: "uppercase", color: "var(--text-tertiary)",
        marginBottom: 6,
      }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{
          fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700,
          letterSpacing: "-0.02em", color: "var(--text-primary)", lineHeight: 1,
        }}>{value}</span>
        {delta && (
          <span style={{ fontSize: 11.5, fontWeight: 600, color: deltaColor }}>{delta}</span>
        )}
      </div>
      {sub && (
        <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
};

// Reporting windows — at-a-glance termly progress, mirrors live app.
const ReportingWindowRow = ({ name, completed, total, dueLabel, dueTone = "neutral" }) => {
  const pct = Math.round((completed / total) * 100);
  const isComplete = completed === total;
  const barColor = isComplete ? "var(--status-success)"
    : dueTone === "warning" ? "var(--status-warning)"
    : "var(--brand-primary)";
  return (
    <div style={{ padding: "12px 0", borderTop: "1px solid var(--border-subtle)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
        <a style={{
          fontSize: 13, fontWeight: 600, color: "var(--text-primary)", textDecoration: "none",
        }}>{name}</a>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600,
          color: isComplete ? "var(--status-success)" : "var(--text-primary)",
        }}>{completed}/{total}</span>
      </div>
      <div style={{
        height: 6, borderRadius: 3,
        background: "var(--surface-sunken)",
        overflow: "hidden", marginBottom: 6,
      }}>
        <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 3 }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-tertiary)" }}>
        <Icon name="clock" size={11} />
        <span>{dueLabel}</span>
      </div>
    </div>
  );
};

const ReportingWindowsCard = () => (
  <Card>
    <SectionLabel action={
      <a style={{ fontSize: 12, color: "var(--brand-primary)", fontWeight: 600, textDecoration: "none" }}>Reporting</a>
    }>Reporting windows</SectionLabel>
    <div>
      <ReportingWindowRow name="Spring Report 2026 · Y7" completed={4} total={4} dueLabel="Closed Tue 31 Mar" />
      <ReportingWindowRow name="Spring Report 2026 · Y8" completed={14} total={31} dueLabel="Closes Thu 30 Apr" dueTone="warning" />
      <ReportingWindowRow name="Summer interim · GCSE" completed={0} total={12} dueLabel="Opens Mon 5 May" />
    </div>
  </Card>
);

// Moderation card — agreement variant (inline Approve OK).
const ModerationAgreement = ({ teacher, klass, pupil, grade, evidence }) => (
  <div style={{
    padding: "14px 16px",
    borderTop: "1px solid var(--border-subtle)",
    display: "flex", gap: 14, alignItems: "flex-start",
    background: "var(--surface-card)",
  }}>
    <span style={{
      width: 32, height: 32, borderRadius: "50%",
      background: "var(--brand-primary-tint)", color: "var(--brand-primary)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: 11, flexShrink: 0,
    }}>{teacher.initials}</span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>{teacher.name}</span>
        <span style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>{klass} · {pupil}</span>
        <Pill tone="success" dot style={{ fontSize: 10.5, padding: "1px 7px" }}>System &amp; teacher agree</Pill>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 6 }}>
        Submitted <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>{grade}</strong>
        <span style={{ color: "var(--text-tertiary)" }}> · routine confirmation</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{evidence}</div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
      <Button variant="primary" size="sm" icon="check">Approve</Button>
    </div>
  </div>
);

// Moderation card — disagreement variant (Review only, no inline Approve).
const ModerationDisagreement = ({ teacher, klass, pupil, grade, suggested, gap, evidence }) => (
  <div style={{
    padding: "14px 16px",
    borderTop: "1px solid var(--border-subtle)",
    display: "flex", gap: 14, alignItems: "flex-start",
    background: "color-mix(in oklab, var(--status-warning-tint) 60%, transparent)",
  }}>
    <span style={{
      width: 32, height: 32, borderRadius: "50%",
      background: "var(--status-warning-tint)", color: "var(--status-warning)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: 11, flexShrink: 0,
      border: "1.5px solid color-mix(in oklab, var(--status-warning) 40%, transparent)",
    }}>{teacher.initials}</span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>{teacher.name}</span>
        <span style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>{klass} · {pupil}</span>
        <Pill tone="warning" dot style={{ fontSize: 10.5, padding: "1px 7px" }}>Disagreement · {gap}</Pill>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 8 }}>
        Teacher submitted <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>{grade}</strong>
        <span style={{ color: "var(--text-tertiary)" }}> · system suggests </span>
        <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>{suggested}</strong>
      </div>
      <div style={{
        fontSize: 12, color: "var(--text-secondary)",
        background: "var(--surface-card)", padding: "8px 10px",
        borderRadius: "var(--radius-md)", borderLeft: "2px solid var(--status-warning)",
        fontStyle: "italic",
      }}>{evidence}</div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
      <Button variant="primary" size="sm" icon="eye">Review</Button>
      <span style={{
        fontSize: 10, color: "var(--text-tertiary)",
        textAlign: "center", lineHeight: 1.3, maxWidth: 90,
      }}>Approval requires evidence review</span>
    </div>
  </div>
);

const Sparkline = ({ values, tone = "primary", width = 80, height = 28 }) => {
  if (!values?.length) return null;
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const pts = values.map((v, i) => `${i * stepX},${height - ((v - min) / range) * height}`).join(" ");
  const stroke = tone === "success" ? "var(--status-success)"
    : tone === "warning" ? "var(--status-warning)"
    : "var(--brand-primary)";
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(values.length - 1) * stepX} cy={height - ((values[values.length - 1] - min) / range) * height} r="2.5" fill={stroke} />
    </svg>
  );
};

const PulseRow = ({ label, value, trend, tone }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 0",
    borderTop: "1px solid var(--border-subtle)",
  }}>
    <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)" }}>{label}</span>
    <Sparkline values={trend} tone={tone} />
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600,
      color: "var(--text-primary)", minWidth: 50, textAlign: "right",
    }}>{value}</span>
  </div>
);

const HoDSection = ({ state = "ready", isMobile }) => {
  if (state === "loading") {
    return (
      <div>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: isMobile ? "wrap" : "nowrap" }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              flex: "1 1 calc(25% - 12px)", minWidth: isMobile ? 140 : 0, height: 86,
              background: "linear-gradient(90deg, var(--surface-sunken), rgba(15,30,61,0.04), var(--surface-sunken))",
              backgroundSize: "400px 100%", animation: "moonbootsShimmer 1.6s linear infinite",
              borderRadius: "var(--radius-lg)",
            }} />
          ))}
        </div>
        <Card style={{ height: 280 }}>
          <div style={{
            height: "100%", borderRadius: "var(--radius-md)",
            background: "linear-gradient(90deg, transparent, rgba(15,30,61,0.04), transparent)",
            backgroundSize: "400px 100%", animation: "moonbootsShimmer 1.6s linear infinite",
          }} />
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Department metrics — language carried from live app: sports active, pupils involved, staff activity */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <Metric label="Sports active" value="2" sub="Football, Athletics" />
        <Metric label="Pupils involved" value="27" delta="↑ 4 vs last wk" deltaTone="positive" />
        <Metric label="Staff activity, week" value="14/17" sub="Voice obs + lesson plans logged" />
        <Metric label="Awaiting moderation" value="6" delta="2 overdue" deltaTone="negative" sub="In your queue" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr", gap: 16 }}>
        {/* Moderation queue — split by agreement vs disagreement */}
        <Card padded={false}>
          <div style={{ padding: "14px 16px", display: "flex", alignItems: "baseline", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>Assessment moderation</h3>
            <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: "var(--text-tertiary)" }}>
              <span><strong style={{ color: "var(--status-success)" }}>4</strong> agree</span>
              <span><strong style={{ color: "var(--status-warning)" }}>2</strong> need review</span>
            </div>
          </div>
          <ModerationDisagreement
            teacher={{ name: "Sarah Patel", initials: "SP" }}
            klass="Year 8 PE"
            pupil="Imani Brooks"
            grade="Working Above (4)"
            suggested="Working At (3)"
            gap="1 grade higher than evidence supports"
            evidence="Hits 3/4 KS3 throwing criteria. Distance 18m vs cohort median 22m. Two pieces of video evidence attached."
          />
          <ModerationAgreement
            teacher={{ name: "Marcus Hill", initials: "MH" }}
            klass="Year 10 GCSE"
            pupil="Olu Adekunle"
            grade="Grade 7"
            evidence="Two pieces of video evidence attached, system confidence 94%."
          />
        </Card>

        {/* Reporting windows + School pulse stacked in the right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ReportingWindowsCard />

          <Card>
            <SectionLabel>School pulse · 4 weeks</SectionLabel>
            <div>
              <PulseRow label="Pupil engagement" value="78%" trend={[72,74,73,76,78,77,78]} tone="success" />
              <PulseRow label="Lesson plan completeness" value="92%" trend={[88,91,90,89,93,91,92]} tone="success" />
              <PulseRow label="Assessment coverage" value="68%" trend={[71,70,72,69,68,67,68]} tone="warning" />
              <PulseRow label="Kit returns, on time" value="84%" trend={[80,82,79,83,84,85,84]} tone="primary" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// Curriculum PE section — restored to live-app minimalism.
// Today's lessons (already in the page-level Today hero, repeated here
// only as a richer per-class card list), My Classes, My Teams.
// ---------------------------------------------------------------------
const ClassTile = ({ name, year, pupilCount, hasContent = true }) => (
  <a style={{
    display: "block",
    padding: "12px 14px",
    background: hasContent ? "var(--brand-accent-tint)" : "var(--surface-sunken)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-md)",
    textDecoration: "none", color: "inherit",
    cursor: "pointer",
  }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{name}</div>
        <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 2 }}>
          {year} · {pupilCount} pupils
        </div>
      </div>
      <Icon name="chevron" size={14} style={{ color: "var(--text-tertiary)" }} />
    </div>
  </a>
);

const TeamTile = ({ name, year, status, hasNextFixture }) => (
  <a style={{
    display: "block",
    padding: "12px 14px",
    background: "var(--surface-sunken)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-md)",
    textDecoration: "none", color: "inherit",
    cursor: "pointer",
  }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{name}</div>
        <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 2 }}>{year} · {status}</div>
      </div>
      <Icon name="chevron" size={14} style={{ color: "var(--text-tertiary)" }} />
    </div>
  </a>
);

const SimpleCard = ({ title, action, children }) => (
  <Card padded={false}>
    <div style={{
      padding: "12px 16px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      borderBottom: "1px solid var(--border-subtle)",
    }}>
      <h3 style={{
        fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600,
        margin: 0, color: "var(--text-primary)",
      }}>{title}</h3>
      {action}
    </div>
    <div style={{ padding: 12 }}>{children}</div>
  </Card>
);

const CurriculumSection = ({ state = "ready", isMobile }) => {
  if (state === "empty") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
        <SimpleCard title="My Classes" action={<a style={{ fontSize: 12, color: "var(--brand-primary)", fontWeight: 600, textDecoration: "none" }}>View all</a>}>
          <div style={{
            padding: "20px 12px", textAlign: "center",
            color: "var(--text-tertiary)", fontSize: 13, fontStyle: "italic",
          }}>No classes assigned yet</div>
        </SimpleCard>
        <SimpleCard title="My Teams" action={<a style={{ fontSize: 12, color: "var(--brand-primary)", fontWeight: 600, textDecoration: "none" }}>View all</a>}>
          <div style={{
            padding: "20px 12px", textAlign: "center",
            color: "var(--text-tertiary)", fontSize: 13, fontStyle: "italic",
          }}>No teams assigned yet</div>
        </SimpleCard>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
      <SimpleCard title="My Classes" action={
        <a style={{ fontSize: 12, color: "var(--brand-primary)", fontWeight: 600, textDecoration: "none" }}>View all</a>
      }>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ClassTile name="Year 7C PE" year="Y7" pupilCount={28} />
          <ClassTile name="Year 8 PE" year="Y8" pupilCount={1} />
          <ClassTile name="Year 9B PE" year="Y9" pupilCount={26} />
          <ClassTile name="Year 10A GCSE" year="Y10" pupilCount={22} />
        </div>
      </SimpleCard>

      <SimpleCard title="My Teams" action={
        <a style={{ fontSize: 12, color: "var(--brand-primary)", fontWeight: 600, textDecoration: "none" }}>View all</a>
      }>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <TeamTile name="Year 9 Football" year="Y9" status="Fixture Thu" />
          <TeamTile name="Year 10 Athletics" year="Y10" status="Training tomorrow" />
        </div>
      </SimpleCard>
    </div>
  );
};

// ---------------------------------------------------------------------
// Extra-Curricular section — Reschedule CTA dropped from weather strip.
// ---------------------------------------------------------------------
const WeatherIcon = ({ kind, size = 16 }) => {
  const map = { sun: "sun", cloud: "cloud", rain: "droplet", wind: "wind" };
  return <Icon name={map[kind] || "cloud"} size={size} />;
};

const NextFixtureCard = ({ fixture, weather }) => {
  const isOutdoor = fixture.outdoor;
  const isBadWeather = weather && (weather.kind === "rain" || weather.kind === "wind") && weather.severity === "high";
  return (
    <Card padded={false}>
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "baseline", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>Next fixture</h3>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>in 2 days</span>
      </div>
      <div style={{ padding: "20px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <Crest initials="AP" size={44} tone="primary" />
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8, color: "var(--text-primary)" }}>Ashworth Park</div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Year 9 Football</div>
          </div>
          <div style={{ textAlign: "center", padding: "0 8px" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>VS</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>Thu, 14:30</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <Crest initials="WG" size={44} tone="muted" />
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8, color: "var(--text-primary)" }}>Whitfield Grove</div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Away</div>
          </div>
        </div>

        {isOutdoor && weather && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px",
            background: isBadWeather ? "var(--status-warning-tint)" : "var(--surface-sunken)",
            border: `1px solid ${isBadWeather ? "color-mix(in oklab, var(--status-warning) 25%, transparent)" : "var(--border-subtle)"}`,
            borderRadius: "var(--radius-md)",
            marginBottom: 12,
          }}>
            <span style={{ color: isBadWeather ? "var(--status-warning)" : "var(--text-secondary)" }}>
              <WeatherIcon kind={weather.kind} size={18} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>{weather.summary}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{weather.detail}</div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="primary" size="sm" style={{ flex: 1 }}>Open match</Button>
          <Button variant="secondary" size="sm" icon="users">Squad</Button>
        </div>
      </div>
    </Card>
  );
};

const TrainingRow = ({ day, time, group, focus }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 0",
    borderTop: "1px solid var(--border-subtle)",
  }}>
    <div style={{ width: 40, flexShrink: 0 }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: "var(--brand-primary)" }}>{day}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>{time}</div>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{group}</div>
      <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{focus}</div>
    </div>
  </div>
);

const PlayerToWatch = ({ name, year, reason, trend }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 0",
    borderTop: "1px solid var(--border-subtle)",
  }}>
    <span style={{
      width: 32, height: 32, borderRadius: "50%",
      background: "var(--brand-accent-tint)", color: "var(--brand-primary)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: 11, flexShrink: 0,
    }}>{name.split(" ").map(n => n[0]).join("")}</span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{name} <span style={{ fontWeight: 400, color: "var(--text-tertiary)", fontSize: 11.5 }}>· {year}</span></div>
      <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{reason}</div>
    </div>
    <Sparkline values={trend} tone="success" width={50} height={20} />
  </div>
);

const ExtraCurricularSection = ({ state = "ready", isMobile, weather }) => {
  if (state === "empty") {
    return (
      <Card style={{ padding: 24, textAlign: "center" }}>
        <Icon name="teamsShield" size={28} style={{ color: "var(--text-tertiary)", marginBottom: 8 }} />
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 14, margin: "0 0 4px", color: "var(--text-primary)" }}>No fixtures or training scheduled</h3>
        <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: "0 auto 12px", maxWidth: 320 }}>
          Schedule a fixture or set up a training group to start tracking extra-curricular activity here.
        </p>
        <div style={{ display: "inline-flex", gap: 8 }}>
          <Button variant="primary" size="sm" icon="plus">Schedule fixture</Button>
          <Button variant="secondary" size="sm">Add training group</Button>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr 1fr", gap: 16 }}>
      <NextFixtureCard
        fixture={{ outdoor: true }}
        weather={weather || { kind: "rain", severity: "high", summary: "Heavy rain expected, 14:00–17:00", detail: "85% chance, 12mm forecast. Pitch may be unplayable." }}
      />

      <Card>
        <SectionLabel action={<a style={{ fontSize: 12, color: "var(--brand-primary)", fontWeight: 600, textDecoration: "none" }}>Plan</a>}>This week's training</SectionLabel>
        <div>
          <TrainingRow day="TUE" time="16:00" group="Y9 Football" focus="Defensive shape, set-pieces" />
          <TrainingRow day="WED" time="07:30" group="Y10 Athletics" focus="Sprint starts, block work" />
          <TrainingRow day="WED" time="16:00" group="Y8 Netball" focus="Centre passes, attacking thirds" />
          <TrainingRow day="FRI" time="16:00" group="Y9 Football" focus="Match prep — Whitfield Grove" />
        </div>
      </Card>

      <Card>
        <SectionLabel action={<a style={{ fontSize: 12, color: "var(--brand-primary)", fontWeight: 600, textDecoration: "none" }}>All</a>}>Players to watch</SectionLabel>
        <div>
          <PlayerToWatch name="Reuben Asante" year="Y9" reason="3 goals in last 2 fixtures" trend={[2,3,3,4,5,6,8]} />
          <PlayerToWatch name="Nia Whitmore" year="Y10" reason="Personal best, 100m sprint" trend={[14,14,13,13,13,12.8,12.5]} />
          <PlayerToWatch name="Toby Lindgren" year="Y8" reason="Voted player of the match" trend={[3,4,4,5,6,6,7]} />
        </div>
      </Card>
    </div>
  );
};

window.HoDSection = HoDSection;
window.CurriculumSection = CurriculumSection;
window.ExtraCurricularSection = ExtraCurricularSection;
window.ReportingWindowsCard = ReportingWindowsCard;
