import { ArrowRight } from "@phosphor-icons/react";
import { BannerArt } from "./ProfileBanner";
import ProfileActions from "./ProfileActions";

interface ProfileMobileProps {
  name: string;
  initials: string;
  photo?: string;
  onPhotoError: () => void;
  department: string;
  /** Institution, school, year: one row each. */
  rows: string[];
  access?: string;
  stats: { name: string; value: string | number }[];
  email?: string;
  since?: string;
  onBilling: () => void;
}

/**
 * The profile on phones: no card, border or rounding, so everything uses the full width. The banner runs edge to edge
 * (up under the floating nav, like the unit page), and sections are separated by hairlines. Desktop keeps the card in ProfilePage.
 */
const ProfileMobile = ({ name, initials, photo, onPhotoError, department, rows, access, stats, email, since, onBilling }: ProfileMobileProps) => (
  <article className="-mt-[60px] pb-10 font-geist text-ink">
    <div className="relative h-48 bg-field">
      <BannerArt />
    </div>

    <div className="px-4">
      <div className="relative -mt-12 flex size-24 items-center justify-center overflow-hidden bg-band text-3xl font-semibold tracking-tight text-brand-light ring-4 ring-background">
        {photo ? (
          <img src={photo} alt={name} referrerPolicy="no-referrer" onError={onPhotoError} className="size-full object-cover" />
        ) : (
          <span aria-hidden>{initials}</span>
        )}
      </div>

      <h1 className="mt-4 text-2xl font-semibold">{name}</h1>
      <p className="mt-1 text-lg">{department}</p>
      {rows.map((row) => <p key={row} className="mt-1 text-sm text-ink-muted">{row}</p>)}
      {access && <p className="mt-1 text-sm text-ink-muted">{access}</p>}

      {/* Five stats: three on the first row, two wider ones below, so no row is left half empty. */}
      <dl className="mt-6 grid grid-cols-6 gap-4 border-t border-line py-6">
        {stats.map((s, i) => (
          <div key={s.name} className={stats.length === 5 && i >= 3 ? "col-span-3" : "col-span-2"}>
            <dt className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">{s.name}</dt>
            <dd className="mt-1.5 text-xl font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-1 border-t border-line pt-6 text-sm text-ink-muted">
        {email && <span className="break-all">{email}</span>}
        {since && <span>Member since {since}</span>}
      </div>

      <button onClick={onBilling} className="group mt-4 inline-flex min-h-11 items-center gap-2 text-lg font-medium text-ink-muted active:text-ink">
        View billing <ArrowRight size={18} />
      </button>

      <div className="mt-6 border-t border-line pt-6">
        <ProfileActions name={name} />
      </div>
    </div>
  </article>
);

export default ProfileMobile;
