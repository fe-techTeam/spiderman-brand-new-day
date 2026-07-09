// Retract the mobile soft keyboard by dropping focus from the active text field.
// The keyboard only hides when the focused input/textarea loses focus, but our
// forms submit via button onClick (not a native form submit that would blur), so
// after "Send / Comment / Post" the keyboard used to linger over the result.
// Call this on a successful submit. It's a harmless no-op on desktop and when
// nothing text-like is focused.
export function dismissKeyboard() {
  if (typeof document === "undefined") return;
  const el = document.activeElement;
  if (el && typeof el.blur === "function" && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
    el.blur();
  }
}
