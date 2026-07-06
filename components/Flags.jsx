// Stylized mini-flag + dot-marker SVGs, ported from `_flag` / `_dotMarker`
// in the mockup. Rendered inside city chips and Web-Twin cards.

const svgProps = {
  viewBox: "0 0 24 16",
  preserveAspectRatio: "xMidYMid slice",
  style: { width: "100%", height: "100%", display: "block" },
};

export function Flag({ code }) {
  switch (code) {
    case "us":
      return (
        <svg {...svgProps}>
          <rect x="0" y="0" width="24" height="16" fill="#b22234" />
          {[1, 3, 5, 7, 9, 11].map((i) => (
            <rect key={"s" + i} x="0" y={(i * 16) / 13} width="24" height={16 / 13} fill="#fff" />
          ))}
          <rect x="0" y="0" width="10" height={(16 * 7) / 13} fill="#3c3b6e" />
          {[[2, 1.4], [4, 1.4], [6, 1.4], [8, 1.4], [3, 3], [5, 3], [7, 3], [2, 4.6], [4, 4.6], [6, 4.6], [8, 4.6]].map((p, i) => (
            <circle key={"st" + i} cx={p[0]} cy={p[1]} r={0.42} fill="#fff" />
          ))}
        </svg>
      );
    case "uk":
      return (
        <svg {...svgProps}>
          <rect x="0" y="0" width="24" height="16" fill="#012169" />
          <path d="M0 0L24 16M24 0L0 16" stroke="#fff" strokeWidth={3.2} />
          <path d="M0 0L24 16" stroke="#c8102e" strokeWidth={1.3} />
          <path d="M24 0L0 16" stroke="#c8102e" strokeWidth={1.3} />
          <rect x="9.6" y="0" width="4.8" height="16" fill="#fff" />
          <rect x="0" y="5.6" width="24" height="4.8" fill="#fff" />
          <rect x="10.6" y="0" width="2.8" height="16" fill="#c8102e" />
          <rect x="0" y="6.6" width="24" height="2.8" fill="#c8102e" />
        </svg>
      );
    case "jp":
      return (
        <svg {...svgProps}>
          <rect x="0" y="0" width="24" height="16" fill="#fff" />
          <circle cx="12" cy="8" r="4.6" fill="#bc002d" />
        </svg>
      );
    case "in":
      return (
        <svg {...svgProps}>
          <rect x="0" y="0" width="24" height="5.33" fill="#ff9933" />
          <rect x="0" y="5.33" width="24" height="5.34" fill="#fff" />
          <rect x="0" y="10.67" width="24" height="5.33" fill="#138808" />
          <circle cx="12" cy="8" r="1.7" fill="none" stroke="#000080" strokeWidth={0.5} />
          <circle cx="12" cy="8" r="0.4" fill="#000080" />
        </svg>
      );
    case "br":
      return (
        <svg {...svgProps}>
          <rect x="0" y="0" width="24" height="16" fill="#009c3b" />
          <polygon points="12,1.6 22.4,8 12,14.4 1.6,8" fill="#ffdf00" />
          <circle cx="12" cy="8" r="3" fill="#002776" />
        </svg>
      );
    case "za":
      return (
        <svg {...svgProps}>
          <rect x="0" y="0" width="24" height="8" fill="#de3831" />
          <rect x="0" y="8" width="24" height="8" fill="#002395" />
          <polygon points="0,4.5 8,8 0,11.5" fill="#007a4d" />
          <rect x="0" y="6.6" width="24" height="2.8" fill="#007a4d" />
          <polygon points="0,6.6 5,8 0,9.4" fill="#007a4d" />
          <polygon points="0,0 9,8 0,16" fill="#000" />
          <polygon points="0,2 6.5,8 0,14" fill="none" stroke="#ffb612" strokeWidth={0.8} />
        </svg>
      );
    case "au":
      return (
        <svg {...svgProps}>
          <rect x="0" y="0" width="24" height="16" fill="#012169" />
          <path d="M0 0L12 8M12 0L0 8" stroke="#fff" strokeWidth={1.8} />
          <rect x="4.8" y="0" width="2.4" height="8" fill="#fff" />
          <rect x="0" y="2.8" width="12" height="2.4" fill="#fff" />
          <rect x="5.4" y="0" width="1.2" height="8" fill="#c8102e" />
          <rect x="0" y="3.4" width="12" height="1.2" fill="#c8102e" />
          <circle cx="6" cy="12.5" r="0.9" fill="#fff" />
          {[[18, 4], [20, 7.5], [17.5, 10.5], [21, 11.5], [19, 13.5]].map((p, i) => (
            <circle key={"ss" + i} cx={p[0]} cy={p[1]} r={0.55} fill="#fff" />
          ))}
        </svg>
      );
    default:
      return (
        <svg {...svgProps}>
          <rect x="0" y="0" width="24" height="16" fill="#333" />
        </svg>
      );
  }
}

export function DotMarker() {
  return (
    <svg viewBox="0 0 24 16" style={{ width: "100%", height: "100%", display: "block" }}>
      <circle cx="12" cy="8" r="5" fill="rgba(255,60,74,0.25)" />
      <circle cx="12" cy="8" r="2.6" fill="#ff3a4a" />
      <circle cx="12" cy="8" r="1" fill="#fff" />
    </svg>
  );
}
