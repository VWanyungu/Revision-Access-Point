# RAP UI/UX Audit: Client and Admin

Date: 2026-11-20. Scope: every route in the student app (`clientFrontend`) and the admin app (`adminFrontend`).

## How this was reviewed (read this first)

| Surface | Method | Confidence |
|---|---|---|
| Client public screens (landing, sign in, sign up, forgot password, 404), desktop and 375px mobile | Live in the browser pane | High |
| Admin sign in (desktop and mobile), 404, signed-out `/dashboard` | Live in the browser pane | High |
| Signed-in client: unit dashboard (all tabs), past papers, PDF viewer, subscriptions, profile, new-subscription on mobile | Live pass after sign-in, see section 10 | High |
| Signed-in admin: dashboard, institutions, units, resources (incl. upload panel), admins, mobile units and resources | Live pass after sign-in, see section 10 | High |
| Answers, quiz, practice and forecast generation, M-Pesa payment, admin schools, departments, profile, bulk flows, syllabus | Static source read only. AI calls are blocked on localhost by CORS, and payments were not run. | Medium. Layout and contrast figures are estimates from tokens. |

Items marked **[verified]** were confirmed first-hand, in the browser or by grep. Everything else comes from the source read. Confirm those at runtime before spending effort on them.

Design lens: the "high-end visual design" bar (nested double-bezel surfaces, button-in-button CTAs, one fluid easing curve, macro whitespace, light-stroke icons, no generic borders or shadows). The brief was to **keep the current feel and only go higher**. Nothing here proposes a re-skin. The app already has pill buttons, a floating pill navbar, hairline-ring cards, Geist, a flat graphite dark theme and one house curve `[0.32,0.72,0,1]`. Every upgrade below extends that language.

---

## 1. Verdict

The visual language is already above average for an ed-tech product in this market. The weaknesses are not in taste. They are in:

1. **Resilience.** Network failures are shown as empty or wrong states, and one of them can send a paying student to the pricing gate.
2. **Wayfinding.** The student app has no URLs inside `/app`, so there are no deep links and the back button leaves the app.
3. **Interaction completeness.** Forms with no submit state, destructive actions with no consequence shown, hover-only affordances, and tooltips as the only error display.
4. **Consistency debt.** Three button systems, about six radii, two toasters, and a mix of old shadcn screens and new token screens.
5. **Accessibility and data cost.** Focus management, touch targets, reduced motion, and several MB of embeds on mobile data.

---

## 2. Preserve (do not touch)

- Floating pill navbar and the crumb card (client `Navbar.tsx`, `PageCrumbs.tsx`; admin `AdminNav.tsx`).
- Hairline-ring cards (`ring-1 ring-line`) instead of drop shadows. Pill inputs and buttons. The 9-step lint-enforced type scale, with Geist as the single font.
- The flat graphite dark theme with its three close greys.
- The honest, plain copy: "Pay once; nothing renews on its own", "Written by AI…", "Marked by AI. It can make mistakes".
- Pricing preview before payment ("A unit with no files yet is still listed so you know before you pay").
- M-Pesa flow structure: four states, `+254` formatting, countdown, 30s resend gate, "Got a confirmation SMS anyway? Check again".
- Admin: the inline side-panel concept, Admins page patterns, Syllabus keyboard reordering (best a11y detail in either app), role-scoped nav.
- 44px touch-row pattern (`max-md:min-h-11`) and the `before:-inset-*` hit-area extension.

---

## 3. Priority list (ranked by impact)

### P0: bugs and trust (fix first)

| # | Finding | Evidence |
|---|---|---|
| 1 | **Admin: opening `/dashboard` signed out leaves a permanent blank dark screen.** The session effect throws an unhandled error (`Cannot destructure 'access_token' of null`) and nothing redirects to `/login`. The same effect hard-codes a Supabase project key. **[verified]** | `adminFrontend/src/components/layout/DashboardLayout.tsx:16-39` |
| 2 | **Admin login logs the password to the console.** **[verified]** | `adminFrontend/src/pages/Login.tsx:33` |
| 3 | **Client: a failed subscriptions fetch is treated as "no subscription".** A paying student on a bad network lands on the pricing gate and may pay twice. | `Index.tsx:60-72` |
| 4 | **Client: renewal looks impossible.** Subscriptions offers "Renew this pass" within 14 days of expiry, but the payment screen refuses any payment while an unexpired pass exists. **[verified: error string present at `MpesaPaymentDialog.tsx:113`]** | `SubscriptionsPage.tsx:125`, `MpesaPaymentDialog.tsx:111-115` |
| 5 | **Client: years 5 and 6 can be bought but not selected.** PricingGate sells Year 1-6, ResourceSearch only offers 1-4. **[verified]** | `PricingGate.tsx:22`, `ResourceSearch.tsx:12` |
| 6 | **Client: query errors read as empty states** (unit "Nothing uploaded yet", subscriptions "No passes yet", AI upgrade "could not find an active pass"). | `UnitDashboard.tsx:140-144`, `SubscriptionsPage.tsx:149-152`, `AiUpgradePage` |
| 7 | **Client: infinite spinner risk.** `JSON.parse` of the stored user has no try/catch, and `checkUser` has no catch. | `Index.tsx:49-50, 276-281` |
| 8 | **Admin: the Resources type tabs are broken.** The tabs are controlled with an initial `'all'` that matches no trigger, and they are driven by `onClick` with no `onValueChange` (arrow keys do nothing). The table header "Status" actually shows the resource type. **[verified: tabs at `Resources.tsx:399, 430`]** | `adminFrontend/src/pages/Resources.tsx` |
| 9 | **Admin: `bg-info/10 text-info` renders unstyled.** The `info` colour has `bg`/`fg` but no `DEFAULT`, so the Notes icon tile and the Course Admin badge lose their styling. **[verified: `tailwind.config.ts:83-85`]** | `Resources.tsx`, `Admins.tsx` |
| 10 | **Admin: a failed save closes the form and loses the entered data.** Submit buttons are never disabled, so a 50MB upload can be double-submitted. Delete uses `formData.id` instead of the row being deleted. | Schools, Departments, Units, Resources |
| 11 | **Admin: a successful delete shows a red "destructive" toast.** | `Schools:102`, `Departments:117`, `Units:155`, `Resources:262` |
| 12 | **Admin: no guard against deleting or demoting yourself or the last super admin.** | `Admins.tsx:105-123` |

### P1: structural UX

13. **Student app has no routing inside `/app`.** Navigation is in-memory state (`Index.tsx:26,122,317-408`). No deep links, a refresh resets to the dashboard, and the Android back gesture exits to landing. This is the largest structural upgrade. Move to nested routes (`/app/unit/:id`, `/paper/:id`, `/answers`, `/quiz`) with a per-page `document.title`.
14. **No persistent wayfinding in the student app.** The logo goes to "resources", the crumb "Back" shows a House icon, and there is no home or active state. Add a floating bottom tab bar on mobile (Unit, Papers, Practice, Profile) in the same pill language as the navbar.
15. **AI-gated actions give no lock cue.** "Quiz me", "Model answers" and Predictions look identical with or without AI, then drop the student into a full-page upsell that discards what they tried. Add a small AI badge, and return the student to their original action after upgrade.
16. **Predictions never shows the forecast.** `forecast.topics` (percent, level, reason) is only passed on to name topics for a practice paper (`PredictionsPanel.tsx:94-96`). The headline value of the feature is invisible. Render the likelihood list with reasons above the paper.
17. **M-Pesa failure state is a dead end.** "Payment not completed" does not distinguish cancel, wrong PIN, insufficient funds or timeout. It has no "if you were charged" guidance, no support contact and no reference. Cancelling on the phone is not detected, so the student waits the full 2 minutes. Leaving mid-wait loses the pending state.
18. **Admin dashboard is revenue-only.** There are no entity counts, recent uploads or content-health signals (resources missing cover, topic or URL). Developer copy leaks to users: "Run revenue_split.sql on the database" (`EarningsPanel:38`).
19. **Admin DataTable has no sort, no total count, no page size, no search on Institutions or Admins, and no empty-state CTA.** Search is copy-pasted in four pages. Departments' school filter is applied client-side on an already-paginated page, so the page shows fewer rows and the totals are wrong.
20. **Admin bulk flows report progress and errors badly.** The progress bar never advances (stale closure). Errors are hover-only tooltips, unreachable by touch or keyboard. There is no end summary and no "retry failed". There is no multi-file drop or CSV template.

### P2: polish and consistency

21. Hero text on landing stays blurred and sits at the fold. **[verified]** See section 4.1.
22. Footer contact is a personal Gmail address, and social links are placeholders. **[verified: Gmail visible in footer]**
23. Three button systems (shadcn `Button`, PayKit `InkButton`/`QuietButton`, local `IslandButton`) and about six radii.
24. Two toasters mounted (Radix and Sonner) in both apps.
25. No `prefers-reduced-motion` handling in either app. **[verified: only a Vite template leftover exists]**
26. Admin hides every scrollbar, including Radix ScrollArea, so scrollable panels have no cue. **[verified: `index.css:265-268`]**

---

## 4. Client app, screen by screen

### 4.1 Landing `/` [verified live]
**Works:** The graduation photo with a navy gradient, "What you get" with four numbered sections (ghost numerals, real UI previews), the focus timer preview, and the floating "Get started" island button with its nested arrow.

**Issues**
- **High: hero headline is blurred and cut off on load.** After 5 seconds the headline was still blurred, and on a 1280x800 viewport the subtitle falls below the fold. On a 375x812 phone the headline starts about 60% down the screen and its subtitle is clipped. The scroll-reveal is gating the most important copy. Fix: render the hero text immediately (no blur-in), anchor it in the upper two thirds, and keep the reveal for the sections below.
- **High: no way to sign in from the first screen.** The only top-right items are social icons, and the floating button says "Get started". "Sign in" appears only in the footer. Returning students have to scroll to the bottom. Add a quiet "Sign in" pill next to the logo.
- **High: price and proof are missing.** "KSH 300 a semester" is a half-visible subtitle. There is no price block, FAQ, "how M-Pesa works" or sample unit. Students decide to pay with no proof. Add a pricing island and a "Try a sample paper" preview.
- **Medium: footer.** The "Navigation" and "Company" labels are low contrast. Terms and privacy are `.txt` files. A 32vw "RAP" watermark adds a lot of scroll.
- **Medium:** three or four Google Font families are `@import`ed (Geist plus Rubik and Birthstone, which look landing-only). That is render-blocking.
- **Opportunity:** the four-section structure is good. Wrap each preview card in the double-bezel (outer 1.5 tray, inner core) and keep the existing reveal curve.

### 4.2 Sign in, sign up, forgot password [verified live]
**Works:** The two-column split (navy value panel, form), clear headings, Google first, the eye toggle, "At least 8 characters", the terms line. On mobile the panel collapses cleanly.

**Issues**
- **Medium:** the navy value panel disappears on mobile with no replacement, so the mobile sign-in has no reason-to-trust copy.
- **Medium:** the sign-in password field and "Forgot password?" sit tight together. The Forgot link underline style differs from "Create an account".
- **Low:** placeholders (`student@university.edu`) are about 2.9:1 contrast.
- **Low:** the 404 page is off-system: grey, `font-bold` (700 is not loaded, so the weight is synthesised), a full-reload `<a href="/">`, and a signed-in student goes to `/` rather than `/app`. **[verified live]**

### 4.3 App shell (`Index.tsx`, Navbar, NavTimer, PageCrumbs, footer)
- Navigation, error and loading problems: items 3, 7, 13 and 14 above.
- The first unit shown after login or payment is an arbitrary `limit(1)` row with no ordering (`Index.tsx:96-114`). Order by code.
- `handleSearch` gives a destructive toast "You are not subscribed…" with no buy CTA.
- After an AI upgrade the page is dismissed and the student's action is lost (`Index.tsx:314`).
- Timer: global but only started from a Timer tab. Finishing gives no sound, notification or title change, and "sessions done today" resets on reload. Buttons are `size-8` (32px).
- Crumb chips truncate at 14rem with no `title`. The in-app footer is 344px tall.
- Logout shows a success toast even if `signOut` fails (`Navbar.tsx:31-40`).
- Dead routed screens: Flashcards, Progress, Calendar and Pomodoro are routed but nothing navigates to them, and they use mock data and old shadcn styling (Calendar is hard-coded to Jan 2024). Delete them or rebuild them on real data (`getProgress` and practice attempts already exist).

### 4.4 First-time unit selection (`ResourceSearch`)
- High: different visual language from the pay screens (shadcn Card, `font-bold`, grey "accent" button). It is the first screen after payment and looks like another product.
- Medium: a six-step stepper over a six-field form. The pass already knows institution, school, department, year and semester. Ask only for the unit, as large tappable rows. Remember the last unit.
- Low: `min-h-[calc(100vh-4rem)]` breaks with mobile URL bars (use `dvh`). CTA "Search Resources" should read "Open this unit".

### 4.5 Unit dashboard (`UnitDashboard.tsx`)
**Works:** Continue-reading hero, per-topic read tracking, syllabus with a mobile topics sheet, past papers by year, 44px rows, staggered rise capped at 8.

**Issues**
- High: every tutorial is a live YouTube iframe. A grid of embeds is several MB per video on mobile data. Use click-to-play thumbnails.
- Medium: the "Library" tab shows only videos. "Read" is recorded on click, not on view. The mobile search placeholder is transparent, so the field looks blank. The `All` tab duplicates the others.
- Medium: pass expiry is only visible at the page bottom. Show a banner at 14 days or less with a Renew CTA.
- Low: all past-paper years are collapsed (open the latest). Banner and cover images have no dimensions (layout shift). `font-light` and `font-medium` headings are mixed.
- Opportunity: a "Next up" strip (continue, latest paper, weakest topic). Promote Predictions and Practice, which are the real exam-prep value.

### 4.6 PDF viewer
**Works:** Lazy page rendering, skeleton pages, page counter, fullscreen with Escape, kind-aware action.
**Issues:** Back always returns to the dashboard. No zoom on mobile. Loading is plain text with no size or progress, and the error state has no Retry. No keyboard paging. No safe-area padding on the bottom bar. Pages are pure white in dark mode (glare). Add a dim toggle and remember the last page per paper.

### 4.7 Answers
**Works:** Clear hierarchy, sticky desktop index, mobile jump sheet, version management, AI disclosure.
**Issues**
- High: no Prism theme CSS is imported anywhere in `src`, `index.html` or `package.json` **[verified by grep]**, and code blocks use a hard-coded `#0f172a` background with inherited ink text. In light mode that is likely dark text on navy. Confirm in the browser, then add a token-based Prism theme.
- Medium: the stat-heavy header pushes the answers below the fold. "Generating" has no progress. Regenerate uses `window.confirm` **[verified: `AnswersPage.tsx:305`]**. Download is desktop-only. A currency `$` in a question will be treated as math (`parseLatex`).

### 4.8 Quiz
**Works:** Clean setup chips, exam-pace option, retry-missed, weak-topic chips, scanned-PDF guidance.
**Issues:** Leaving mid-quiz has no confirmation, so a paid generation is lost. There is no per-question feedback (an immediate-reveal mode would help). Results read "7 of 10 correct" with no percent, previous score or next step, and weak-topic chips go nowhere. The score save failure is silent. The timer effect has no dependency array, the timer is colour-only and not announced. Switch and chips are under 44px.

### 4.9 Predictions and Practice exam
**Works:** Polling with progress text, saved paper with an "outdated, update is free" note, autosave, leave-and-resume, hand-in confirmation with unanswered count and AI consent.
**Issues:** Forecast not rendered (item 16). `persist` has no catch, so "Saving…" can stick and work can be lost. The empty state is a bare "Generate CAT 1" with no cost or time. The marking loop is a `for(;;)` with no backoff or cancel, and photos upload at up to 5MB each with no downscale. The timed option is an unstyled native checkbox with no stated duration. `window.confirm` on regenerate **[verified: `PredictionsPanel.tsx:232`]**. Success and warning colours used as text fail AA.

### 4.10 Pricing gate and AI add-on
**Works:** Server price, included-units preview, skeleton, honest AI toggle copy, mobile pinned bar.
**Issues:** The student pays before seeing any product (add a sample). The mobile bar shows only "KSh X", with the breakdown and "Access until" hidden on phones. A disabled Continue gives no reason. M-Pesa is not named until the last step. Price load failure says "refresh the page" with no Retry. The AI upgrade page is a full-page takeover with no navbar and a dead-end "could not find an active pass".

### 4.11 M-Pesa payment (a full page, not a dialog)
See item 17. Also: resend after 30 seconds can trigger a second prompt with no double-charge warning, step changes do not move focus or announce, `autoFocus` on the phone field pops the keyboard, and trust cues are thin (no M-Pesa mark, no business name in "you will see a prompt from…", no "never share your PIN"). The receipt omits the paid date and time.

### 4.12 Subscriptions and Profile
- Subscriptions: one dominant pass with a time bar and ending-soon state is good. Renew opens a blank PricingGate (preselect the pass). The receipt is a bare ref with no copy button, amount or date. Query error shows "No passes yet".
- Profile: read-only. No edit name, password, theme, delete account or sign out here. Stats are jargon ("Avg best", "Paper avg") in a `grid-cols-3` with an orphan row. Two parallel implementations (desktop and mobile) cause a first-render flash.

---

## 5. Admin app, screen by screen

### 5.1 Sign in `/login` [verified live]
**Works:** Centred card, pill inputs, logo.
**Issues:** The `••••••••` placeholder looks like a pre-filled password **[verified]**. No heading or h1. The error is "Invalid credentials" for every failure, with no `role="alert"`. The loading state replaces the label with a bare spinner. No show/hide, `autoComplete`, `autoFocus` or forgot-password path. Dark-only and visually unrelated to the client's split layout. Already-signed-in users are not redirected.

### 5.2 Shell and navigation
**Works:** Floating pill, role-filtered links, mobile collapse, `canOpen` route guard.
**Issues:** Active and hover states are the same `bg-field`, so the current page is unclear. There are no breadcrumbs, so the Institution > School > Department > Unit > Resource hierarchy is invisible. A blank screen shows while the profile loads. The Menu icon is imported but unused, so tablets have no visible hamburger. The theme toggle shows the current mode and has a static label. No skip link and no per-page `document.title`. Opening the side panel makes the main column jump to 1500px with no transition.

### 5.3 Dashboard
See item 18. Also: all three stat cards look identical (your share is not emphasised), the "passes sold" icon is `Percent`, `trend` exists but is never used, the month list is capped at 6 with no order guarantee and no chart, and the earnings table has no overflow wrapper at 360px.

### 5.4 Institutions, Schools, Departments, Units
**Works:** A consistent list pattern (search, institution filter, table, panel), debounced search, inline renaming, parent context badges.
**Issues:** Items 10, 11, 19 above. In addition:
- Row action icons have no `aria-label` in Schools, Departments, Units and Resources. Edit and Delete sit side by side with no separation.
- Required markers are inconsistent, and selects are not `required`.
- Year and semester options are 1-4 in Units but 1-3 in BulkCreate.
- Delete copy is inconsistent ("courses" where the UI says "departments"), and nothing says what will be deleted.
- Labels use `htmlFor` ids that match nothing. The search icon is offset by hard-coded `left-2 top-2.5`, and the search has no clear button or result count.
- The `InlineText` edit pencil is `opacity-0` until hover, so inline edit cannot be discovered on touch.

### 5.5 Resources
Items 8 and 9 above. Also: `alert()` for file validation, no upload progress or cancel, `console.log` calls left in, a 13-field unsectioned form with no sticky submit bar, a drop zone that is not keyboard accessible with no drag highlight, and the user email read via `JSON.parse(localStorage…)` in three places (crashes without a token).

### 5.6 Admins
**Works:** Best page in the admin app (role badges, scope summaries, helpful description, saving state, server errors shown).
**Issues:** Item 12. Count cards show 3 of 4 roles and are not clickable filters. No role filter or search. The disabled email field has no explanation. Changing role silently resets selections. Checkbox lists have no select-all, search or "3 selected" count. A blank `full_name` crashes the initials.

### 5.7 Profile, Syllabus, shared pieces
- Profile: blank while loading, no remove-banner or crop, no password change, and the user cannot see their own role or scope.
- Syllabus: deleting a topic has no confirmation even though resources may hang off it. Save and add give no pending or success feedback. Reorder fires 2N parallel PATCHes with no rollback on failure.
- `InlinePanel`: no `role="dialog"`, no autofocus, Escape does not close it, no focus return. On mobile it becomes a fixed sheet with no overlay, trap or scroll lock.
- `ConfirmDialog`: an inline banner that can render below the fold, with no focus move, no loading state (double-click deletes twice) and a generic "Delete" label.
- `Dropdown`: options are `<li onClick>` with no keyboard navigation, and the popover is clipped by the scrolling panel.

---

## 6. Design-system findings (both apps)

**Tokens and consistency**
- Radii: pill, `rounded-3xl`, `rounded-2xl`, `rounded-xl`, `rounded-lg`, `rounded-[10px]`, `rounded-[2rem]`, `rounded-md`. Define 4 named radii, and make the nested ones concentric.
- Shadows: hard-coded `shadow-[0_8px_30px_-14px_rgba(14,21,37,0.18)]` in at least five client files, `shadow-[0_24px_64px_-16px_rgba(0,0,0,0.5)]` in `InlinePanel`. Use a `--shadow-float` token (tinted, diffused, never black-on-black).
- Hard-coded `green-500` and `red` in the admin bulk modals. Two danger tokens (`danger`, `destructive`) used interchangeably.
- Admin `text-[10px]` (`BulkUploadModal:260`) violates the app's own type-scale lint.
- Dead weight: `App.css` (Vite template, both apps), Sonner (both apps), `font-literata` and `font-serif` aliases, unused imports.

**Motion**
- No global reduced-motion rule in either app. `animate-pulse`, `animate-spin`, smooth `scrollIntoView` and the 0.9s blur and 40px fade-up `Reveal` ignore it.
- Tailwind keyframes still use `ease-out` and `ease-in-out`. Point everything at the house curve through a token.
- Dropdowns and panels open and close instantly. Add transform and opacity enter and exit.

**Accessibility**
- Contrast estimates (measure before changing): `text-ink-subtle` about 2.9:1, `text-warning` about 2:1, `text-success` about 3.3:1, admin destructive button text about 3.8:1, and `text-primary` icons about 2.5:1 on dark surfaces. Use `text-brand` for icons in dark mode.
- Bottom sheets and popovers have no focus trap or restore. Custom tablists have no arrow-key roving.
- Many touch targets are under 44px: NavTimer, PDF pager, quiz chips and switch, filter pills, answer action buttons.
- Global scrollbar hiding in the admin app removes the scroll cue.

**Data cost (Kenya context)**
- Click-to-play video, downscaled photo uploads, self-hosted subsetted Geist, route-level lazy loading for KaTeX, Prism, recharts and react-pdf.
- `sw.js` is network-first and caches every GET, including Supabase JSON responses (stale, and possibly authenticated). Cache the shell and PDFs only, and add an offline banner.
- `manifest.json` uses `theme_color #0EA5E9` (sky blue, not the RAP blue) and `display: fullscreen`, which hides the phone status bar.

---

## 7. Elevation opportunities (extending the current feel)

These are the "go higher" moves, ordered by return.

1. **Spread the double-bezel from Subscriptions to the other money surfaces.** The live pass confirmed the Subscriptions pass card already uses a tray plus inner core and is the best-looking screen in the app. Use it as the reference and apply the same treatment to the pricing and payment card, the quiz-option card and the unit hero card. The nested button-in-button arrow already exists on landing and on "New subscription", so reuse it on "Renew" and the pricing "Continue".
2. **One motion token set.** `--ease-house: cubic-bezier(0.32,0.72,0,1)` with 200, 400 and 700ms durations, applied to Tailwind keyframes, Radix popovers and the sheets. Add a global reduced-motion block. This makes every state change feel the same, and it is a small diff.
3. **Lighter icon stroke.** Lucide at the default 2px is the one thing that reads "template". Setting `strokeWidth={1.5}` globally (or moving to Phosphor Light) fits the existing hairline language.
4. **Hero rebuilt around the headline.** Headline first, crisp, in the top two thirds, with the price and "Sign in" pill in view, then the existing numbered sections. Use `min-h-[100dvh]` so iOS Safari does not jump.
5. **A real empty-state and error-state kit.** One `<EmptyState icon title action>` and one `<LoadFailed onRetry>` in the double-bezel style, used by every list and query in both apps. This fixes items 6 and 19 and removes the "blank screen" class of bug.
6. **Bottom tab pill on mobile** (client), in the same floating-glass language as the top navbar. `backdrop-blur` is fine here because it is fixed.
7. **Result moments.** Quiz and practice results are the emotional peak of the product and currently show "7 of 10 correct". Give them a large figure, previous best, and one next action ("Review the 3 you missed", "Open topic: Normalisation").
8. **Admin tables that feel like a product.** Sortable headers, a count line ("1-10 of 84"), sticky header, skeleton rows with varied widths, row-level hover reveal that also works on touch, and an empty state with a primary action.
9. **Admin sign-in alignment.** Reuse the client's split layout (value panel plus form), in the admin graphite theme, so the two products feel like one family.

---

## 8. Suggested roadmap

> **Status (2026-11-20): Stage 1 is done in the working tree, not committed.** Done: items 1 to 12 from section 3 (item 6 covers the pass check, unit page and subscriptions; the AI upgrade page still has its own "no pass found" message), the shared "couldn't load, Try again" component (`LoadFailed`), a themed confirm dialog replacing both `window.confirm` calls, and removal of the four dead screens. Edge-function change in `mpesa-initiate-payment` needs deploying. Verified live: signed-out admin `/dashboard` now redirects to `/login`; admin Resources tabs and delete dialog behave. Not exercised live: the client error states, renewal payment and the admin save-failure path (no safe way to trigger them here). Found while doing it: a new pass is shown as lasting 4 months (`PayKit.accessUntil`) but the payment callback grants 6.

**Week 1 (bugs, trust, no visual change):** items 1-12, plus remove the password `console.log`, add `LoadFailed`, align year ranges, delete the dead routed screens, and replace both `window.confirm` calls with an `AlertDialog`.

**Weeks 2-3 (structure):** nested routes and the back button, mobile tab pill, AI lock cues with return-to-action, render the forecast, rebuild the M-Pesa failure, pending and renew flows, admin `ListToolbar`, `RowActions`, `ConfirmDialog` and form-submit pattern.

**Weeks 3-4 (elevation):** the motion token set and reduced motion, radii and shadow tokens, button-system consolidation, double-bezel on the three money surfaces, hero rebuild, result moments, admin dashboard rebuild, bulk flow rebuild, a11y pass on sheets and dropdowns.

---

## 9. Not covered, and what would close the gaps

- **Signed-in screens were not seen running** (both apps). Layout, spacing, real data states, dark mode in the study screens, and measured contrast are all unconfirmed. A live pass requires an authenticated session.
- Not reviewed: `ui/*` beyond dropdown and button, `useProfile` and `useEarnings` internals, the supabase edge functions, and the Capacitor/PWA shell behaviour on real devices.
- The Prism and contrast findings are from grep and token estimates. Confirm in the browser.

---

## 10. Live pass addendum (signed in, both apps)

**Limits of this pass.** AI features cannot run from `localhost`: the browser blocks the `generate-answers` call because the hosted function sends no CORS header for that origin. So answers, quiz, forecast and practice generation were not exercised and stay code-only. Some admin screenshots looked dim. That was the hidden browser pane, not the app: computed colours and opacity were normal, so it is not a finding.

**Corrections to earlier sections**
- The desktop PDF viewer already has zoom (−, 100%, +) and fullscreen. The "no zoom" note in 4.6 applies to mobile only, which I did not test.
- The Subscriptions pass card already uses the double-bezel (see section 7, item 1).
- The black profile avatar is the user's own Google photo (it loaded at 288px). It is not a bug.

### Client, verified live
| # | Finding |
|---|---|
| L1 | **~~The unit page opens on the Library tab.~~ Retracted.** The default tab is Syllabus (`UnitDashboard.tsx:201`). The Library tab I saw was remembered from earlier use in the same browser session (`sessionStorage`). What remains true: an empty unit shows only "Nothing has been uploaded for this unit yet." above a full footer, and the Library tab held one video although notes exist. |
| L2 | **The first unit after sign-in is arbitrary.** The student landed on Computer Graphics, an empty unit, rather than the last-used or richest one. |
| L3 | **The unit picker is rough.** The popover has six fields and runs off the bottom of an 800px screen, so "Search Resources" sits below the fold and the option list is clipped. Units are unsorted (Computer Forensics, Software Project Management, Machine Learning, …) and a Year 3 list shows duplicates ("Software Engineering" twice, "Advanced Java" and "Advanced Java Programming"). Year offers only 1-4. Add alphabetical or code order and tidy the duplicate unit records in the admin data. |
| L4 | **Dropdown buttons are announced by their label only.** The accessibility tree shows "Institution", "Year of Study", "Unit", never the selected value. |
| L5 | **Past papers is sparse.** Collapsed year rows use about 60% of the width and leave the right 40% empty. Years with no papers are omitted (2024/25 is missing), although the landing page promises "gaps are marked, not hidden". Rows are small 13px text ("CAT 1 · Paper · Model answers") with no AI cue. |
| L6 | **The PDF viewer is strong.** Floating toolbar, page counter, zoom, fullscreen and a clear primary action. The URL stays `/app` and the tab title stays "Revision Access Point" throughout. |
| L7 | **AI failures are harsh and lose context.** "Model answers" failed with a red destructive toast ("Failed to load the answers. Please try again.") and sent the student back to the dashboard. There was no in-page error with Retry or Back to paper. The Predictions tab shows a raw, small red "Failed to fetch" with no retry. The cause here was CORS, but any network failure takes the same path. |
| L8 | **The Syllabus tab is the strongest study screen.** Two-column layout, numbered topics with completion ticks, a mobile "Topics 2/14" floating pill, and good microcopy ("marked complete once you open the note. 1 left"). "Quiz me" and "Read the answers" still carry no AI cue. |
| L9 | **Subscriptions is the visual benchmark** (nested tray, AI badge, ref, days-left bar). Two active passes are both titled "Computer Science", so the heading cannot tell them apart. Put year and semester in the title. |
| L10 | **Profile is read-only and cramped.** Five stats sit in a three-column grid, leaving an orphan second row ("Papers marked", "Paper avg"). The account menu contains only Profile and Log out. |
| L11 | **Mobile (375px):** the unit search is a blank pill (invisible placeholder). On the Syllabus view the Timer icon wraps onto its own row. The new-subscription bottom bar shows "—" for price, with Cancel and a disabled Continue and no reason given. |

### Admin, verified live
| # | Finding |
|---|---|
| L12 | **Resources type tabs:** labels are lowercase ("all", "tutorials", "cats", "exams", "notes") and none has `aria-selected` on load. The "Status" column shows the type ("Exams", "Tutorials"). |
| L13 | **The Upload panel is not a dialog.** After opening it, focus stays on `<body>`, there is no `role="dialog"`, and Escape does not close it. At 1280px the table squeezes so resource names wrap to 4-6 lines, and the form is 13 fields long. |
| L14 | **The dashboard with no revenue is mostly empty.** Three "KSH 0" cards and two empty panels fill about 45% of the screen. Add counts, recent uploads and content health so the page is useful before the first sale. |
| L15 | **Admins:** the count cards read 0, 0, 0 with one admin listed, because Super Admins are not counted. The Super Admin role badge is dim blue on graphite and looks low contrast. |
| L16 | **Units on mobile:** the delete button is clipped at the right edge of the table card. Edit, Delete and Syllabus are unlabeled icons. The list is unsorted (BCS 417, BIT 421, BCS 467, BCS 311). |
| L17 | **Resources on mobile:** the tab row shows no selected state. |
