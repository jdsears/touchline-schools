/* global React, Icon, Crest */

// =====================================================================
// IA SPEC — Pattern (a) with collapse rules. Designed for triple-role.
//
// Structure:
//   1. Cross-role top cluster (max 3): Today, AI Assistant, Search.
//   2. Role groups in fixed order (SCHOOL ADMIN > HOD > CURRICULUM PE >
//      EXTRA-CURRICULAR), each with:
//        - Daily cluster (5–7 items)
//        - "More" sub-group (collapsed by default, weekly-or-less items)
//   3. School settings group (collapsed by default, global, NOT per-role).
//   4. Pinned footer: user.
//
// Dedupe: an item appearing in multiple roles renders only in the
// highest-priority role group (priority = ROLE_ORDER index).
// =====================================================================

const CROSS_ROLE_TOP = [
  { id: "today",        icon: "calendar", label: "Today" },
  { id: "ai-assistant", icon: "aiAssist", label: "AI Assistant", badge: "AI" },
  { id: "search",       icon: "search",   label: "Search" },
];

const ROLE_DEFS = {
  schoolAdmin: {
    // School Admin is single-role (not subject to the 18-item triple-role
    // budget), so the daily cluster carries all 8 natural surfaces.
    label: "School Admin",
    daily: [
      { id: "school-overview",     icon: "schoolOverview", label: "School Overview" },
      { id: "teachers",            icon: "teachersAdmin",  label: "Teachers", emptyHint: "Add teachers" },
      { id: "pupils",              icon: "pupils",         label: "Pupils",   emptyHint: "Import pupils" },
      { id: "all-teams",           icon: "teamsShield",    label: "All Teams" },
      { id: "all-classes",         icon: "classes",        label: "All Classes" },
      { id: "voice-obs",           icon: "voiceObs",       label: "Voice Observations" },
      { id: "reporting",           icon: "reports",        label: "Reporting" },
      { id: "assessment-overview", icon: "assessment",     label: "Assessment Overview" },
    ],
    more: [
      { id: "safeguarding",        icon: "safeguard",      label: "Safeguarding" },
    ],
  },
  hod: {
    // When HoD is held WITHOUT School Admin: items elevate.
    // When held WITH School Admin: this role is hidden (its items live
    // under School Admin). Handled in dedupe logic below.
    label: "Head of Department",
    daily: [
      { id: "school-overview",     icon: "schoolOverview", label: "School Overview" },
      { id: "teachers",            icon: "teachersAdmin",  label: "Teachers" },
      { id: "all-teams",           icon: "teamsShield",    label: "All Teams" },
      { id: "all-classes",         icon: "classes",        label: "All Classes" },
      { id: "voice-obs",           icon: "voiceObs",       label: "Voice Observations" },
      { id: "reporting",           icon: "reports",        label: "Reporting" },
    ],
    more: [
      { id: "pupils",              icon: "pupils",         label: "Pupils" },
      { id: "assessment-overview", icon: "assessment",     label: "Assessment Overview" },
    ],
  },
  teacherCurriculum: {
    label: "Curriculum PE",
    daily: [
      { id: "dashboard-c",       icon: "dashboard",  label: "Dashboard" },
      { id: "my-classes",        icon: "classes",    label: "My Classes", emptyHint: "No classes assigned" },
      { id: "lesson-planning",   icon: "training",   label: "Lesson Planning" },
      { id: "assessment",        icon: "assessment", label: "Assessment" },
      { id: "curriculum-overview", icon: "target",   label: "Curriculum Overview" },
    ],
    more: [
      { id: "reports-c",         icon: "reports",    label: "Reports" },
    ],
  },
  teacherExtraCurricular: {
    label: "Extra-Curricular",
    daily: [
      { id: "my-teams",      icon: "teamsShield", label: "My Teams" },
      { id: "fixtures",      icon: "fixtures",    label: "Fixtures & Results", active: true },
      { id: "session-plan",  icon: "sessions",    label: "Session Planning" },
      { id: "pupil-dev",     icon: "pupilDev",    label: "Pupil Development" },
      { id: "film-room",     icon: "film",        label: "Film Room" },
    ],
    more: [
      { id: "tactics",       icon: "tactics",     label: "Tactics Board" },
      { id: "video-library", icon: "videos",      label: "Video Library" },
    ],
  },
};

const SETTINGS_GROUP = {
  label: "School settings",
  items: [
    { id: "consent",   icon: "consent",  label: "Parental Consent" },
    { id: "privacy",   icon: "privacy",  label: "Data & Privacy" },
    { id: "sso",       icon: "key",      label: "SSO Settings" },
    { id: "voice-cfg", icon: "voiceCfg", label: "Voice Settings" },
  ],
};

const ROLE_ORDER = ["schoolAdmin", "hod", "teacherCurriculum", "teacherExtraCurricular"];

// Dedupe: collect all ids seen earlier in priority order; later groups
// drop those ids from both daily and more.
function buildVisibleRoles(roles) {
  const ordered = ROLE_ORDER.filter(r => roles.includes(r));
  // If schoolAdmin is held, fold HoD into it: drop HoD entirely (its items
  // are subsumed by School Admin's broader scope).
  const folded = ordered.includes("schoolAdmin")
    ? ordered.filter(r => r !== "hod")
    : ordered;
  const seen = new Set();
  return folded.map(roleId => {
    const role = ROLE_DEFS[roleId];
    const filterIds = (list) => list.filter(it => {
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    });
    return {
      id: roleId,
      label: role.label,
      daily: filterIds(role.daily),
      more: filterIds(role.more || []),
    };
  });
}

const SidebarItem = ({ icon, label, active, badge, emptyHint, tooltip, dim }) => (
  <div title={tooltip} style={{
    display: "flex", alignItems: "center", gap: 10,
    padding: "6px 10px",
    margin: "0 8px",
    borderRadius: "var(--radius-md)",
    fontSize: 13, fontWeight: active ? 600 : 500,
    cursor: "pointer",
    background: active ? "var(--brand-accent-tint)" : "transparent",
    color: active ? "var(--brand-primary)" : dim ? "var(--text-tertiary)" : "var(--text-secondary)",
  }}>
    <Icon name={icon} size={16} strokeWidth={active ? 1.8 : 1.6} />
    <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
    {emptyHint && (
      <span style={{ fontSize: 10.5, color: "var(--text-tertiary)", fontStyle: "italic" }}>{emptyHint}</span>
    )}
    {badge && (
      <span style={{
        fontSize: 9.5, fontWeight: 700, letterSpacing: "0.04em",
        background: "var(--brand-accent)", color: "var(--on-brand-accent)",
        padding: "1px 6px", borderRadius: "var(--radius-full)",
        textTransform: "uppercase",
      }}>{badge}</span>
    )}
  </div>
);

const GroupLabel = ({ children, expanded, onClick, collapsible }) => (
  <div onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 6,
    padding: "12px 18px 4px",
    cursor: collapsible ? "pointer" : "default", userSelect: "none",
  }}>
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
      textTransform: "uppercase", color: "var(--brand-accent)",
      flex: 1,
    }}>{children}</span>
    {collapsible && (
      <Icon name="chevronDown" size={12} style={{
        color: "var(--text-tertiary)",
        transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
        transition: "transform 0.15s",
      }} />
    )}
  </div>
);

const MoreToggle = ({ count, expanded, onClick }) => (
  <div onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 6,
    padding: "5px 10px", margin: "2px 8px 0",
    borderRadius: "var(--radius-md)",
    fontSize: 12, fontWeight: 500,
    cursor: "pointer", color: "var(--text-tertiary)",
    userSelect: "none",
  }}>
    <Icon name="chevronDown" size={12} style={{
      transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
      transition: "transform 0.15s",
    }} />
    <span>{expanded ? "Less" : `More (${count})`}</span>
  </div>
);

const Sidebar = ({
  roles = ["teacherExtraCurricular"],
  school = { short: "Ashworth Park Academy", initials: "AP", roleLabel: "Teacher" },
  activeId,
  newSchool = false,
}) => {
  const visible = buildVisibleRoles(roles);
  const isMulti = visible.length > 1;
  const [moreState, setMoreState] = React.useState({});
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const toggleMore = (id) => setMoreState(s => ({ ...s, [id]: !s[id] }));

  const renderItem = (item) => {
    const showHint = newSchool && item.emptyHint;
    return (
      <SidebarItem
        key={item.id}
        icon={item.icon}
        label={item.label}
        badge={item.badge}
        active={activeId ? activeId === item.id : item.active}
        emptyHint={showHint ? item.emptyHint : null}
        tooltip={item.tooltip}
      />
    );
  };

  return (
    <aside style={{
      width: 248, flexShrink: 0,
      background: "var(--surface-sunken)",
      borderRight: "1px solid var(--border-subtle)",
      display: "flex", flexDirection: "column",
      height: "100%", fontFamily: "var(--font-sans)",
    }}>
      {/* School identity */}
      <div style={{
        padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 10,
        background: "var(--brand-primary)", color: "var(--on-brand-primary)",
      }}>
        <Crest initials={school.initials} src={school.crestSrc} variant={school.crestVariant || "square"} size={32} style={{
          background: "rgba(255,255,255,0.10)",
          color: "var(--brand-accent)",
          border: "1px solid rgba(255,255,255,0.18)",
        }} />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, minWidth: 0, flex: 1 }}>
          <span style={{
            fontSize: 13.5, fontWeight: 600,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{school.short}</span>
          <span style={{ fontSize: 11, color: "var(--text-on-dark-secondary)" }}>{school.roleLabel}</span>
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
        {/* Cross-role top cluster, ungrouped (max 3) */}
        <div style={{ paddingTop: 10 }}>
          {CROSS_ROLE_TOP.map(renderItem)}
        </div>

        {/* Role groups */}
        {visible.map(role => (
          <React.Fragment key={role.id}>
            {isMulti && <GroupLabel>{role.label}</GroupLabel>}
            {!isMulti && <div style={{ height: 8 }} />}
            {role.daily.map(renderItem)}
            {role.more.length > 0 && (
              <>
                <MoreToggle
                  count={role.more.length}
                  expanded={!!moreState[role.id]}
                  onClick={() => toggleMore(role.id)}
                />
                {moreState[role.id] && role.more.map(renderItem)}
              </>
            )}
          </React.Fragment>
        ))}

        {/* Global School settings, collapsed by default */}
        <GroupLabel
          collapsible
          expanded={settingsOpen}
          onClick={() => setSettingsOpen(o => !o)}
        >{SETTINGS_GROUP.label}</GroupLabel>
        {settingsOpen && SETTINGS_GROUP.items.map(renderItem)}
      </nav>

      <div style={{
        borderTop: "1px solid var(--border-subtle)",
        padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "var(--brand-primary-tint)", color: "var(--brand-primary)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: 11.5,
        }}>JS</span>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>John Sears</span>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{school.roleLabel}</span>
        </div>
        <Icon name="arrow" size={15} style={{ color: "var(--text-tertiary)" }} />
      </div>
    </aside>
  );
};

// School Admin / Teacher toggle. Mirrors the live app's top-right pill.
// Only rendered when the user holds both schoolAdmin and at least one
// teacher role; otherwise there's nothing to switch between.
const RoleToggle = ({ active = "schoolAdmin", onChange }) => {
  const opts = [
    { id: "schoolAdmin", label: "School Admin" },
    { id: "teacher",     label: "Teacher" },
  ];
  return (
    <div role="tablist" style={{
      display: "inline-flex", padding: 2,
      background: "var(--surface-card)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-full)",
    }}>
      {opts.map(o => {
        const isActive = o.id === active;
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange?.(o.id)}
            style={{
              padding: "5px 14px", border: "none", cursor: "pointer",
              fontSize: 12.5, fontWeight: 600, letterSpacing: "-0.005em",
              borderRadius: "var(--radius-full)",
              background: isActive ? "var(--brand-primary)" : "transparent",
              color: isActive ? "var(--on-brand-primary)" : "var(--text-secondary)",
            }}
          >{o.label}</button>
        );
      })}
    </div>
  );
};

const TopBar = ({ children, url, isMobile, onMenu, roleToggle }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12,
    padding: isMobile ? "10px 14px" : "12px 24px",
    borderBottom: "1px solid var(--border-subtle)",
    background: "var(--surface-page)",
  }}>
    {isMobile && (
      <button onClick={onMenu} style={{
        width: 32, height: 32, borderRadius: "var(--radius-md)",
        background: "var(--surface-sunken)", border: "1px solid var(--border-subtle)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "var(--text-primary)",
      }}><Icon name="menu" size={16} /></button>
    )}
    {children}
    <span style={{ flex: 1 }} />
    {url && !isMobile && (
      <span style={{ fontSize: 11.5, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{url}</span>
    )}
    {roleToggle && !isMobile && (
      <RoleToggle active={roleToggle.active} onChange={roleToggle.onChange} />
    )}
  </div>
);

// Persistent floating mic for Voice Observations. Lives outside any
// page composition; sits over content at z=40, bottom-right.
const VoiceObsMic = ({ onClick, recording = false }) => (
  <button
    onClick={onClick}
    aria-label="Record voice observation"
    style={{
      position: "absolute",
      right: 24, bottom: 24, zIndex: 40,
      width: 52, height: 52, borderRadius: "50%",
      background: recording ? "var(--status-error)" : "var(--status-success)",
      border: "none", cursor: "pointer",
      color: "var(--on-brand-primary)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 8px 22px rgba(15,30,61,0.22), 0 2px 6px rgba(15,30,61,0.14)",
    }}
  >
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" stroke="none" />
      <path d="M5 11a7 7 0 0014 0M12 18v3M9 21h6" />
    </svg>
  </button>
);

const TabStrip = ({ tabs, active }) => (
  <div style={{
    display: "flex", gap: 4,
    background: "var(--surface-sunken)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-md)", padding: 3, width: "fit-content",
  }}>
    {tabs.map(t => {
      const isActive = t.id === active;
      return (
        <div key={t.id} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: "var(--radius-sm)",
          fontSize: 13, fontWeight: 600,
          background: isActive ? "var(--brand-primary)" : "transparent",
          color: isActive ? "var(--on-brand-primary)" : "var(--text-secondary)",
          cursor: "pointer",
        }}>
          <Icon name={t.icon} size={14} />
          <span>{t.label}</span>
        </div>
      );
    })}
  </div>
);

window.Sidebar = Sidebar;
window.TopBar = TopBar;
window.TabStrip = TabStrip;
window.RoleToggle = RoleToggle;
window.VoiceObsMic = VoiceObsMic;
window.ROLE_DEFS = ROLE_DEFS;
window.ROLE_ORDER = ROLE_ORDER;
window.CROSS_ROLE_TOP = CROSS_ROLE_TOP;
window.SETTINGS_GROUP = SETTINGS_GROUP;
window.buildVisibleRoles = buildVisibleRoles;
