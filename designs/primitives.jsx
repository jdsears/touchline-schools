/* global React, Icon */

// Crest component. Supports image source or initials fallback.
// Variant: square (default), wide (height-locked), or text (initials only).
// Fallback feels like a TODO: dashed border, "Add crest" tooltip-ready.
const Crest = ({
  initials,
  src,
  size = 32,
  variant = "square",
  tone = "primary", // primary | accent | muted
  todo = false,      // visually mark as upload-needed
  title,
  style,
}) => {
  const radius = "var(--crest-radius)";
  const bg =
    tone === "accent" ? "var(--brand-accent-tint)"
    : tone === "muted" ? "var(--surface-sunken)"
    : "var(--brand-primary-tint)";
  const fg =
    tone === "accent" ? "var(--on-brand-accent)"
    : tone === "muted" ? "var(--text-secondary)"
    : "var(--brand-primary)";

  const baseStyle = {
    width: variant === "wide" ? "auto" : size,
    height: size,
    minWidth: variant === "wide" ? size * 1.4 : size,
    borderRadius: radius,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: Math.round(size * 0.42),
    letterSpacing: "0.02em",
    background: bg,
    color: fg,
    border: todo ? `1.5px dashed var(--border-strong)` : `1px solid color-mix(in oklab, ${fg} 15%, transparent)`,
    flexShrink: 0,
    overflow: "hidden",
    ...style,
  };

  if (src) {
    return (
      <span style={baseStyle} title={title} aria-label={title}>
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </span>
    );
  }
  return (
    <span style={baseStyle} title={title} aria-label={title}>
      {initials}
    </span>
  );
};

// Status pill. Variants map to the system tokens.
const Pill = ({ tone = "neutral", children, dot = false, live = false, style }) => {
  const map = {
    success: { bg: "var(--status-success-tint)", fg: "var(--status-success)" },
    warning: { bg: "var(--status-warning-tint)", fg: "var(--status-warning)" },
    error:   { bg: "var(--status-error-tint)",   fg: "var(--status-error)" },
    info:    { bg: "var(--status-info-tint)",    fg: "var(--status-info)" },
    accent:  { bg: "var(--brand-accent-tint)",   fg: "var(--brand-primary)" },
    primary: { bg: "var(--brand-primary-tint)",  fg: "var(--brand-primary)" },
    neutral: { bg: "var(--surface-sunken)",      fg: "var(--text-secondary)" },
    live:    { bg: "var(--status-error-tint)",   fg: "var(--status-error)" },
  };
  const s = map[tone] || map.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px", borderRadius: "var(--radius-full)",
      background: s.bg, color: s.fg,
      fontSize: 12, fontWeight: 600, letterSpacing: "0.01em",
      lineHeight: 1.4, whiteSpace: "nowrap",
      ...style,
    }}>
      {live ? (
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "var(--status-error)",
          animation: "moonbootsPulse 1.6s ease-in-out infinite",
        }} />
      ) : dot ? (
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
      ) : null}
      {children}
    </span>
  );
};

// Buttons.
const Button = ({ variant = "primary", size = "md", icon, iconRight, children, style, onClick }) => {
  const sizes = {
    sm: { padY: 6,  padX: 12, fs: 13, gap: 6, h: 30 },
    md: { padY: 8,  padX: 14, fs: 14, gap: 8, h: 36 },
    lg: { padY: 12, padX: 18, fs: 15, gap: 8, h: 44 },
  }[size];

  const variants = {
    primary: {
      background: "var(--brand-primary)", color: "var(--on-brand-primary)",
      border: "1px solid var(--brand-primary)",
    },
    accent: {
      background: "var(--brand-accent)", color: "var(--on-brand-accent)",
      border: "1px solid var(--brand-accent)",
    },
    secondary: {
      background: "var(--surface-card)", color: "var(--text-primary)",
      border: "1px solid var(--border-default)",
    },
    ghost: {
      background: "transparent", color: "var(--text-primary)",
      border: "1px solid transparent",
    },
    danger: {
      background: "var(--surface-card)", color: "var(--status-error)",
      border: "1px solid var(--border-default)",
    },
  }[variant];

  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: sizes.gap, justifyContent: "center",
      padding: `${sizes.padY}px ${sizes.padX}px`, height: sizes.h,
      borderRadius: "var(--radius-md)",
      fontSize: sizes.fs, fontWeight: 600, letterSpacing: "-0.005em",
      cursor: "pointer", whiteSpace: "nowrap",
      ...variants,
      ...style,
    }}>
      {icon && <Icon name={icon} size={sizes.fs + 2} />}
      <span>{children}</span>
      {iconRight && <Icon name={iconRight} size={sizes.fs + 2} />}
    </button>
  );
};

// Card primitive.
const Card = ({ children, style, padded = true }) => (
  <div style={{
    background: "var(--surface-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    padding: padded ? "var(--space-6)" : 0,
    boxShadow: "var(--shadow-sm)",
    ...style,
  }}>
    {children}
  </div>
);

// Section heading.
const SectionLabel = ({ children, action, style }) => (
  <div style={{
    display: "flex", alignItems: "baseline", justifyContent: "space-between",
    marginBottom: "var(--space-3)", ...style,
  }}>
    <span style={{
      fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
      textTransform: "uppercase", color: "var(--text-tertiary)",
    }}>{children}</span>
    {action}
  </div>
);

// Keyframes injected once.
if (typeof document !== "undefined" && !document.getElementById("moonboots-keyframes")) {
  const s = document.createElement("style");
  s.id = "moonboots-keyframes";
  s.textContent = `
    @keyframes moonbootsPulse {
      0%,100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.45; transform: scale(0.85); }
    }
    @keyframes moonbootsShimmer {
      0% { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
  `;
  document.head.appendChild(s);
}

window.Crest = Crest;
window.Pill = Pill;
window.Button = Button;
window.Card = Card;
window.SectionLabel = SectionLabel;
