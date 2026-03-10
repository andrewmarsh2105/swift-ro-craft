/**
 * src/hooks/useUnsavedChangesGuard.ts
 *
 * Blocks navigation when there are unsaved changes (NO autosave).
 * Uses beforeunload only — avoids useBlocker which requires data router API.
 */
import { useEffect } from "react";

export function useUnsavedChangesGuard(when: boolean, _message?: string) {
  useEffect(() => {
    if (!when) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [when]);
}
