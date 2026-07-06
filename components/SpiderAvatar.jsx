// Spider-emblem avatar used across the Forum (header, cards, comments).
export default function SpiderAvatar({ size = "56%", stroke = "#ff5a6a", strokeWidth = 3.5 }) {
  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="50" cy="44" rx="9" ry="12" />
      <path d="M50 32V16M42 36 22 26M58 36l20-10M43 52 27 66M57 52l16 14M50 56v20" />
    </svg>
  );
}
