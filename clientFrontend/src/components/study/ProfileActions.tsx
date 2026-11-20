import { useState } from "react";
import { toast } from "sonner";
import { LockKey, PencilSimple, SignOut } from "@phosphor-icons/react";
import { supabase } from "@/database/supabase";
import { useAuth } from "@/context/AuthContext";
import { InkButton, QuietButton } from "@/components/pay/PayKit";

/** Edit name, change password and sign out. Shared by the desktop card and the phone layout. */
const ProfileActions = ({ name }: { name: string }) => {
  const { user, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [saving, setSaving] = useState(false);
  // Google accounts have no password here to change.
  const hasPassword = user?.app_metadata?.provider === "email";

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = draft.trim();
    if (!next || next === name) { setEditing(false); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: next } });
    setSaving(false);
    if (error) { toast.error(`Couldn't save your name. ${error.message}`); return; }
    toast.success("Name updated");
    setEditing(false);
  };

  const changePassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) toast.error(`Couldn't send the link. ${error.message}`);
    else toast.success(`We sent a link to ${user.email} to choose a new password.`);
  };

  const logOut = async () => {
    localStorage.removeItem("user");
    try {
      await signOut();
      toast.success("Logged out");
    } catch (e) {
      toast.error(`Error logging out: ${(e as Error).message}`);
    }
  };

  if (editing) {
    return (
      <form onSubmit={saveName} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="profile-name">Your name</label>
        <input
          id="profile-name" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={80} autoComplete="name"
          className="h-11 w-full min-w-0 shrink-0 rounded-full border-0 bg-field px-5 text-base outline-none focus-visible:ring-2 focus-visible:ring-brand-solid sm:flex-1"
        />
        <div className="flex gap-2">
          <InkButton type="submit" disabled={saving || !draft.trim()}>{saving ? "Saving…" : "Save"}</InkButton>
          <QuietButton type="button" tone="soft" disabled={saving} onClick={() => { setDraft(name); setEditing(false); }}>Cancel</QuietButton>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <QuietButton type="button" tone="soft" className="gap-2" onClick={() => { setDraft(name); setEditing(true); }}>
        <PencilSimple size={16} aria-hidden /> Edit name
      </QuietButton>
      {hasPassword && (
        <QuietButton type="button" tone="soft" className="gap-2" onClick={changePassword}>
          <LockKey size={16} aria-hidden /> Change password
        </QuietButton>
      )}
      <QuietButton type="button" tone="soft" className="gap-2 text-danger" onClick={logOut}>
        <SignOut size={16} aria-hidden /> Sign out
      </QuietButton>
    </div>
  );
};

export default ProfileActions;
