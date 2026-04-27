/* global React, Sidebar, TopBar, TabStrip, MatchOverview, Icon, Button, Crest,
   ROLE_DEFS, ROLE_ORDER, PINNED */

const tabs = [
  { id: "overview", icon: "matches", label: "Overview" },
  { id: "squad", icon: "users", label: "Squad" },
  { id: "prep", icon: "formation", label: "Match Prep" },
  { id: "report", icon: "trophy", label: "Report" },
  { id: "video", icon: "videos", label: "Video" },
];

const Crumb = ({ items }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)", minWidth: 0 }}>
    {items.map((it, i) => (
      <React.Fragment key={i}>
        {i > 0 && <Icon name="chevron" size={12} style={{ color: "var(--text-tertiary)" }} />}
        <span style={{
          fontWeight: i === items.length - 1 ? 600 : 500,
          color: i === items.length - 1 ? "var(--text-primary)" : "var(--text-secondary)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{it}</span>
      </React.Fragment>
    ))}
  </div>
);

// Desktop screen: Match Overview reachable from My Teams. Crumb: My Teams
// > Year 7 Boys Football > Fixtures > Whitfield (2 May).
const DesktopScreen = ({
  schoolTheme = "moonboots",
  state = "pre",
  variant = "default",
  school,
  roles = ["teacherExtraCurricular"],
  newSchool = false,
  showRoleToggle = false,
}) => (
  <div data-theme={schoolTheme} style={{
    background: "var(--surface-page)",
    color: "var(--text-primary)",
    width: 1280, height: 900,
    display: "flex", flexDirection: "row",
    fontFamily: "var(--font-sans)",
    overflow: "hidden",
  }}>
    <Sidebar roles={roles} school={school} activeId="fixtures" newSchool={newSchool} />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <TopBar
        url={schoolTheme === "moonboots" ? "app.moonbootssports.com" : `${schoolTheme}.moonbootssports.com`}
        role={showRoleToggle ? "teacher" : undefined}
      >
        <Crumb items={["My Teams", "Year 7 Boys Football", "Fixtures", "Whitfield, 2 May"]} />
      </TopBar>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 32px" }}>
        <div style={{ marginBottom: 18 }}>
          <TabStrip tabs={tabs} active="overview" />
        </div>
        <MatchOverview state={state} variant={variant} schoolTheme={schoolTheme} />
      </div>
    </div>
  </div>
);

// Mobile drawer state: shows the full sidebar overlaid on the page.
const MobileDrawer = ({ roles, school, onClose, newSchool = false }) => (
  <div style={{
    position: "absolute", inset: 0, zIndex: 50,
    background: "rgba(15, 30, 61, 0.45)",
    display: "flex",
  }}>
    <div style={{
      width: 280, height: "100%",
      background: "var(--surface-sunken)",
      display: "flex", flexDirection: "column",
      animation: "slideIn 0.18s ease-out",
    }}>
      <Sidebar roles={roles} school={school} newSchool={newSchool} activeId="fixtures" />
    </div>
    <div onClick={onClose} style={{ flex: 1 }} />
  </div>
);

const PhoneShell = ({ children, schoolTheme = "moonboots" }) => (
  <div data-theme={schoolTheme} style={{
    width: 375, height: 812, borderRadius: 44,
    background: "#0F1E3D",
    padding: 10,
    boxShadow: "0 24px 60px rgba(15,30,61,0.18), 0 4px 12px rgba(15,30,61,0.10)",
  }}>
    <div style={{
      width: "100%", height: "100%",
      borderRadius: 36, overflow: "hidden",
      background: "var(--surface-page)",
      position: "relative",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px 6px",
        fontSize: 14, fontWeight: 600, color: "var(--text-primary)",
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: "var(--font-mono)" }}>14:02</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center", color: "var(--text-primary)" }}>
          <span style={{ display: "inline-flex", gap: 1.5 }}>
            {[3,5,7,9].map(h => <span key={h} style={{ width: 3, height: h, background: "currentColor", borderRadius: 1 }} />)}
          </span>
          <svg width="16" height="11" viewBox="0 0 16 11" fill="none"><path d="M7.5.5c2.5 0 4.8.9 6.5 2.4l-.7.7a8 8 0 00-11.6 0l-.7-.7A9.4 9.4 0 017.5.5z" fill="currentColor"/><path d="M7.5 4c1.7 0 3.2.6 4.4 1.6l-.7.7a4.6 4.6 0 00-7.4 0l-.7-.7A5.6 5.6 0 017.5 4z" fill="currentColor"/><circle cx="7.5" cy="9" r="1.5" fill="currentColor"/></svg>
          <svg width="22" height="11" viewBox="0 0 22 11" fill="none"><rect x=".5" y=".5" width="19" height="10" rx="2.5" stroke="currentColor"/><rect x="2" y="2" width="14" height="7" rx="1" fill="currentColor"/><rect x="20" y="4" width="1.5" height="3" rx=".75" fill="currentColor"/></svg>
        </div>
      </div>
      {children}
    </div>
  </div>
);

const MobileScreen = ({
  schoolTheme = "moonboots",
  state = "pre",
  variant = "default",
  school,
  drawerOpen = false,
  roles = ["teacherExtraCurricular"],
}) => (
  <PhoneShell schoolTheme={schoolTheme}>
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
        <span style={{
          fontSize: 13, fontWeight: 600,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{school?.short || "Ashworth Park"}</span>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Year 7 Boys Football</span>
      </div>
      <button style={{
        width: 32, height: 32, borderRadius: "50%",
        background: "var(--brand-primary)", color: "var(--on-brand-primary)",
        border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}><Icon name="bell" size={16} /></button>
    </div>

    <div style={{
      display: "flex", gap: 16, overflowX: "auto",
      padding: "10px 16px",
      borderBottom: "1px solid var(--border-subtle)",
      flexShrink: 0,
    }}>
      {tabs.map(t => (
        <div key={t.id} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 13, fontWeight: 600,
          color: t.id === "overview" ? "var(--brand-primary)" : "var(--text-tertiary)",
          paddingBottom: 6,
          borderBottom: t.id === "overview" ? "2px solid var(--brand-accent)" : "2px solid transparent",
          whiteSpace: "nowrap",
          marginBottom: -11,
        }}>
          <Icon name={t.icon} size={13} />
          {t.label}
        </div>
      ))}
    </div>

    <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px" }}>
      <MatchOverview state={state} variant={variant} schoolTheme={schoolTheme} isMobile />
    </div>

    {drawerOpen && (
      <MobileDrawer roles={roles} school={school} />
    )}
  </PhoneShell>
);

// Sidebar-only artboard (not a full screen) for IA examples.
const SidebarOnly = ({ roles, school, schoolTheme = "moonboots", newSchool = false, height = 720 }) => (
  <div data-theme={schoolTheme} style={{
    height, display: "flex",
    background: "var(--surface-page)",
    fontFamily: "var(--font-sans)",
  }}>
    <Sidebar roles={roles} school={school} newSchool={newSchool} activeId="fixtures" />
  </div>
);

window.DesktopScreen = DesktopScreen;
window.MobileScreen = MobileScreen;
window.MobileDrawer = MobileDrawer;
window.SidebarOnly = SidebarOnly;
window.PhoneShell = PhoneShell;
