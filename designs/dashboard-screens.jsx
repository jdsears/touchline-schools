/* global React, Sidebar, TopBar, TabStrip, Icon, Button, Crest, PageHeader,
   BriefingCard, TodayHero, RoleSection, HoDSection, CurriculumSection,
   ExtraCurricularSection, ROLE_DOTS, PhoneShell, VoiceObsMic */

// =====================================================================
// Dashboard screens — full page composition.
// Carries chrome unchanged from Match Overview, plus persistent voice
// mic and global School Admin/Teacher toggle in the top bar.
// =====================================================================

const DEMO_EVENTS = [
  { start: 8.5,  end: 9.5,  lane: 0, role: "teacherCurriculum",     label: "9B PE · Badminton" },
  { start: 9.5,  end: 10.5, lane: 1, role: "hod",                   label: "HoD standup" },
  { start: 11.0, end: 12.0, lane: 0, role: "teacherCurriculum",     label: "7C PE · Football", live: true },
  { start: 12.5, end: 13.0, lane: 1, role: "hod",                   label: "Cover review" },
  { start: 13.5, end: 14.5, lane: 0, role: "teacherCurriculum",     label: "10A GCSE · Theory" },
  { start: 15.0, end: 16.0, lane: 0, role: "teacherCurriculum",     label: "8D PE · Long jump" },
  { start: 16.0, end: 17.5, lane: 1, role: "teacherExtraCurricular", label: "Y9 Football training" },
];

// Temporal chip vocabulary, locked across the system:
//   - hours for under 48h ("36h", "12h")
//   - day-of-week for current week ("Thu", "Fri")
//   - "Next week" for 7-14 days
//   - absolute date thereafter ("12 May")
//   - "Overdue" is a status chip that stacks with any of the above
const DEMO_ACTIONS = [
  { role: "teacherExtraCurricular", verb: "Confirm squad",      subject: "vs Whitfield Grove, Thu 14:30",                deadline: "36h",      urgency: "high",   cta: "Open"   },
  { role: "hod",                    verb: "Moderate grade",     subject: "Sarah Patel, Y8 Imani Brooks",                  deadline: "Tue",      urgency: "high",   cta: "Review" },
  { role: "teacherCurriculum",      verb: "Submit grades",      subject: "Y10A GCSE coursework",                          deadline: "Overdue",  urgency: "high",   cta: "Open"   },
  { role: "hod",                    verb: "Resolve voice obs",  subject: "Marcus Hill, flagged audio 24 Apr",             deadline: "Fri",      urgency: "medium", cta: "Listen" },
  { role: "teacherExtraCurricular", verb: "Notify parents",     subject: "Possible weather rescheduling, Thu fixture",    deadline: "Wed",      urgency: "medium", cta: "Send"   },
];

const DEMO_BRIEFING = "Two fixtures this week, Thursday's vs Whitfield Grove may be affected by Wednesday's storm front. Six grades await your moderation, two overdue. Sarah Patel's Y8 throwing assessment is the priority, evidence suggests one grade lower than submitted.";
const DEMO_PRIORITY = { label: "Review Sarah Patel's Y8 Imani Brooks grade, system disagreement", cta: "Review" };

const DashCrumb = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>
    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Today</span>
  </div>
);

const DashboardBody = ({
  roles = ["hod", "teacherCurriculum", "teacherExtraCurricular"],
  isMobile = false,
  state = "ready",          // ready | loading | empty
  briefingState = "ready",  // ready | loading | quiet
  weatherSeverity = "high",
}) => {
  const isMulti = roles.length > 1;
  const events = state === "empty" ? [] : DEMO_EVENTS.filter(e => roles.includes(e.role));
  const actions = state === "empty" ? [] : DEMO_ACTIONS.filter(a => roles.includes(a.role));

  const effectiveBriefingState = state === "loading" ? "loading"
    : state === "empty" ? "quiet"
    : briefingState;

  return (
    <div style={{
      maxWidth: isMobile ? "100%" : 1140,
      margin: "0 auto",
      padding: isMobile ? "16px 16px 32px" : "20px 28px 40px",
    }}>
      <PageHeader name="John" />

      <BriefingCard
        briefing={DEMO_BRIEFING}
        priorityAction={effectiveBriefingState === "ready" ? DEMO_PRIORITY : null}
        state={effectiveBriefingState}
      />

      <TodayHero
        events={events}
        actions={actions}
        isMobile={isMobile}
        roles={roles}
        state={state === "empty" ? "empty" : state === "loading" ? "loading" : "ready"}
      />

      {/* Role sections — only visible roles */}
      {roles.includes("hod") && (
        <RoleSection roleId="hod" showLabel={isMulti} action={
          <a style={{ fontSize: 12, color: "var(--brand-primary)", fontWeight: 600, textDecoration: "none" }}>School overview ›</a>
        }>
          <HoDSection state={state === "loading" ? "loading" : "ready"} isMobile={isMobile} />
        </RoleSection>
      )}

      {roles.includes("teacherCurriculum") && (
        <RoleSection roleId="teacherCurriculum" showLabel={isMulti}>
          <CurriculumSection state={state === "empty" ? "empty" : "ready"} isMobile={isMobile} />
        </RoleSection>
      )}

      {roles.includes("teacherExtraCurricular") && (
        <RoleSection roleId="teacherExtraCurricular" showLabel={isMulti}>
          <ExtraCurricularSection
            state={state === "empty" ? "empty" : "ready"}
            isMobile={isMobile}
            weather={
              weatherSeverity === "low"
                ? { kind: "sun", severity: "low", summary: "Clear, 16°C at kick-off", detail: "Light wind from the south." }
                : { kind: "rain", severity: "high", summary: "Heavy rain expected, 14:00–17:00", detail: "85% chance, 12mm forecast. Pitch may be unplayable." }
            }
          />
        </RoleSection>
      )}
    </div>
  );
};

const DashboardDesktop = ({
  schoolTheme = "moonboots",
  school,
  roles = ["hod", "teacherCurriculum", "teacherExtraCurricular"],
  state = "ready",
  briefingState = "ready",
  weatherSeverity = "high",
  newSchool = false,
  showRoleToggle = false,
  roleToggleActive = "schoolAdmin",
}) => (
  <div data-theme={schoolTheme} data-screen-label="Dashboard" style={{
    background: "var(--surface-page)",
    color: "var(--text-primary)",
    width: 1280, height: 1100,
    display: "flex", flexDirection: "row",
    fontFamily: "var(--font-sans)",
    overflow: "hidden",
    position: "relative",
  }}>
    <Sidebar roles={roles} school={school} activeId="today" newSchool={newSchool} />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <TopBar
        url={schoolTheme === "moonboots" ? "app.moonbootssports.com" : `${schoolTheme}.moonbootssports.com`}
        roleToggle={showRoleToggle ? { active: roleToggleActive } : null}
      >
        <DashCrumb />
      </TopBar>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <DashboardBody
          roles={roles}
          state={state}
          briefingState={briefingState}
          weatherSeverity={weatherSeverity}
        />
      </div>
    </div>
    <VoiceObsMic />
  </div>
);

const DashboardMobile = ({
  schoolTheme = "moonboots",
  school,
  roles = ["hod", "teacherCurriculum", "teacherExtraCurricular"],
  state = "ready",
  briefingState = "ready",
  weatherSeverity = "high",
}) => (
  <PhoneShell schoolTheme={schoolTheme}>
    <div data-screen-label="Dashboard mobile" style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 16px 12px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--surface-page)",
        flexShrink: 0,
      }}>
        <button style={{
          width: 32, height: 32, borderRadius: "var(--radius-md)",
          background: "var(--surface-sunken)", border: "1px solid var(--border-subtle)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: "var(--text-primary)",
        }}><Icon name="menu" size={16} /></button>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{school?.short || "Ashworth Park"}</span>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Today</span>
        </div>
        <button style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "var(--brand-primary)", color: "var(--on-brand-primary)",
          border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}><Icon name="bell" size={16} /></button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <DashboardBody
          roles={roles}
          isMobile
          state={state}
          briefingState={briefingState}
          weatherSeverity={weatherSeverity}
        />
      </div>

      {/* Mobile mic — same component, slightly nudged for thumb reach */}
      <VoiceObsMic />
    </div>
  </PhoneShell>
);

window.DashboardDesktop = DashboardDesktop;
window.DashboardMobile = DashboardMobile;
