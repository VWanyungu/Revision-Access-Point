import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/data/supabase';
import { uploadImage } from '@/data/db';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { InlineText } from '@/components/shared/InlineText';

const MAX_MB = 5;

const Profile = () => {
  const { data: me } = useProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState<'avatar' | 'banner' | 'name' | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  const save = async (kind: 'avatar' | 'banner' | 'name', data: Record<string, string>) => {
    setBusy(kind);
    const { error } = await supabase.auth.updateUser({ data });
    setBusy(null);
    if (error) return toast({ title: 'Could not save profile', variant: 'destructive' });
    await queryClient.invalidateQueries({ queryKey: ['me'] });
    toast({ title: 'Profile updated' });
  };

  const changeEmail = async (email: string) => {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) { toast({ title: error.message, variant: 'destructive' }); throw error; }
    toast({ title: 'Check your inbox', description: `Confirm ${email} to finish changing your email.` });
  };

  const pick = async (kind: 'avatar' | 'banner', file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_MB * 1024 * 1024)
      return toast({ title: `Choose an image under ${MAX_MB}MB`, variant: 'destructive' });
    setBusy(kind);
    try {
      const url = await uploadImage(file);
      await save(kind, { [kind === 'avatar' ? 'avatar_url' : 'banner_url']: url });
    } catch {
      setBusy(null);
      toast({ title: 'Upload failed', variant: 'destructive' });
    }
  };

  if (!me) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profile" description="Your photo, banner, name and email." />

      <article className="overflow-hidden rounded-3xl bg-surface ring-1 ring-line">
        <div className="relative h-44 bg-field">
          {me.bannerUrl && <img src={me.bannerUrl} alt="" className="h-full w-full object-cover" />}
          <Button type="button" size="sm" variant="secondary" className="absolute right-4 top-4" disabled={busy === 'banner'} onClick={() => bannerInput.current?.click()}>
            {busy === 'banner' ? <Loader2 className="animate-spin" /> : <Camera />} Change banner
          </Button>
          <input ref={bannerInput} type="file" accept="image/*" hidden onChange={(e) => { pick('banner', e.target.files?.[0]); e.target.value = ''; }} />
        </div>

        <div className="px-6 pb-8 md:px-10">
          <div className="relative -mt-16 size-32 md:size-36">
            <div className="flex size-full items-center justify-center overflow-hidden rounded-full bg-band text-4xl font-semibold text-brand-light ring-4 ring-surface">
              {me.avatarUrl ? <img src={me.avatarUrl} alt="" className="size-full object-cover" /> : me.initials}
            </div>
            <button type="button" aria-label="Change profile photo" disabled={busy === 'avatar'} onClick={() => avatarInput.current?.click()}
              className="absolute bottom-1 right-1 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-surface transition-colors hover:bg-primary-dark">
              {busy === 'avatar' ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            </button>
            <input ref={avatarInput} type="file" accept="image/*" hidden onChange={(e) => { pick('avatar', e.target.files?.[0]); e.target.value = ''; }} />
          </div>

          <dl className="mt-6 space-y-4 border-t border-line pt-6">
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">Display name</dt>
              <dd className="mt-1.5 text-xl font-semibold">
                <InlineText value={me.name} onSave={(v) => save('name', { full_name: v })} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">Email</dt>
              <dd className="mt-1.5 text-base">
                <InlineText type="email" value={me.email} validate={(v) => /^\S+@\S+\.\S+$/.test(v)} onSave={changeEmail} />
              </dd>
            </div>
          </dl>
        </div>
      </article>
    </div>
  );
};

export default Profile;
