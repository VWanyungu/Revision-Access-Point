import { useState } from 'react';

/** Runs a submit handler one at a time, so a slow save cannot be sent twice. `saving` drives the button state. */
export const useSubmitLock = <A extends unknown[]>(fn: (...args: A) => Promise<unknown>) => {
  const [saving, setSaving] = useState(false);
  const run = async (...args: A) => {
    if (saving) return;
    setSaving(true);
    try { await fn(...args); } finally { setSaving(false); }
  };
  return [run, saving] as const;
};
