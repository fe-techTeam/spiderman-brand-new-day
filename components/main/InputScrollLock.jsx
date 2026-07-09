"use client";

import { useEffect } from "react";

// Mobile typing UX: while a text field has focus, the page must not scroll —
// on iOS every keystroke re-scrolls the caret into view, which dragged the
// landing page's snap sections around (worst on the MJ Wall composer). The
// lock engages a beat AFTER focus so the browser can first bring the field
// above the keyboard, and releases when focus leaves (tapping out, keyboard
// "Done", or a submit that calls dismissKeyboard()). Scrolling inside the
// focused field itself (long textareas) stays allowed. Desktop (fine
// pointer) is untouched. Mounted once in the root layout.
export default function InputScrollLock() {
  useEffect(() => {
    if (!window.matchMedia || !window.matchMedia("(pointer: coarse)").matches) return;

    const isEditable = (el) =>
      !!el &&
      ((el.tagName === "INPUT" &&
        !/^(checkbox|radio|button|submit|reset|range|file|color)$/.test(el.type)) ||
        el.tagName === "TEXTAREA" ||
        el.isContentEditable);

    let lockedField = null;
    let lockTimer = null;

    // overflow:hidden alone doesn't stop iOS touch-drags — block the gesture,
    // except inside the focused field so its own text keeps scrolling
    const onTouchMove = (e) => {
      if (lockedField && lockedField.contains(e.target)) return;
      if (e.cancelable) e.preventDefault();
    };

    const lock = (field) => {
      lockedField = field;
      document.documentElement.classList.add("bnd-kb-lock");
      document.addEventListener("touchmove", onTouchMove, { passive: false });
    };
    const unlock = () => {
      lockedField = null;
      document.documentElement.classList.remove("bnd-kb-lock");
      document.removeEventListener("touchmove", onTouchMove);
    };

    const scheduleLock = (field) => {
      clearTimeout(lockTimer);
      // ~300ms: native scroll-into-view + keyboard animation settle first
      lockTimer = setTimeout(() => {
        if (document.activeElement === field) lock(field);
      }, 300);
    };

    const onFocusIn = (e) => {
      if (isEditable(e.target)) scheduleLock(e.target);
    };
    const onFocusOut = () => {
      clearTimeout(lockTimer);
      // wait a tick — focus may just be hopping to the next field
      lockTimer = setTimeout(() => {
        const active = document.activeElement;
        if (isEditable(active)) {
          if (active !== lockedField) {
            unlock();
            scheduleLock(active);
          }
        } else {
          unlock();
        }
      }, 60);
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      clearTimeout(lockTimer);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      unlock();
    };
  }, []);

  return null;
}
