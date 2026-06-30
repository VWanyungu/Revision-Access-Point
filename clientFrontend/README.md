# Client Frontend

The client frontend is the consumer-facing React application for RAP. It manages user authentication, subscription gating, resource browsing, quiz/answer generation, and PDF viewing.

## Functional Overview

### App architecture

- `src/App.tsx` is the entry point. It wraps the app in:
  - `ThemeProvider` for theme persistence
  - `QueryClientProvider` for React Query caching
  - `BrowserRouter` for route handling
- The main screen state is handled in `src/pages/Index.tsx`, which switches between:
  - landing page
  - login/signup
  - pricing gate
  - study dashboard
  - PDF viewer
  - quiz and answers workflows

### Authentication and subscription gating

- Authentication uses Supabase auth from `src/database/supabase.ts`.
- `Index.tsx` checks `supabase.auth.getUser()` and then verifies subscription records in the `subscriptions` table.
- If the user is unsubscribed, the app sends them to `PricingGate`.
- If the user has a valid subscription, the app loads the selected academic context from `localStorage.resourceSelection` or falls back to the first eligible unit.
- The app uses Supabase session tokens stored in local storage for server calls that require authorization.

### Database access and React Query

- `src/database/utils.ts` contains Supabase query helpers for the client app.
- Key functions include:
  - `getResources(unitId, filter)`
  - `getSchools()`
  - `getDepartments()`
  - `getDepartmentsBySchoolId(schoolId)`
  - `getUnits()`
  - `getUnitsByDepartmentIdYearSemester(departmentId, year, semester)`
- Most screens use `useQuery` to fetch and cache server data, including:
  - `PricingGate.tsx` for school/department/unit selection
  - `ResourceSearch.tsx` and `ResourceSearchModal.tsx` for selecting a study context
  - `StudyDashboard.tsx` for resource lists and filters
  - `SubscriptionsPage.tsx` for the user subscription history
- React Query is responsible for keeping data fresh and reducing duplicate network calls.

### Custom backend functions and direct fetch calls

- The client uses native `fetch()` for two server-side operations that are not handled by Supabase table helpers:
  - `generate-answers` via `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-answers`
  - quiz generation in `src/components/study/QuizSystem.tsx`
- These requests include the Supabase auth bearer token and send JSON payloads.
- The answers workflow in `Index.tsx` switches the UI into an `answers` page state while the Edge Function processes the request.

### Math and code rendering

- Study content is rendered by `src/components/study/MixedContentRenderer.tsx`.
- It parses text and renders:
  - inline math with `react-katex` using `$...$`
  - block math using `$$...$$`
  - code fences using triple backticks
- Code blocks are highlighted with `PrismJS`, with support for Python and JavaScript.
- The renderer detects explicit language markers and falls back to a heuristic language detector.

### PDF viewing

- `src/pages/PdfViewerPage.tsx` handles PDF display using `react-pdf` and `pdfjs-dist`.
- `pdfjs.GlobalWorkerOptions.workerSrc` points to a CDN-hosted worker for browser compatibility.
- The viewer provides:
  - continuous scrolling through all PDF pages
  - current-page tracking by scroll position
  - navigation buttons for previous/next pages
  - zoom controls
  - page rotation
- The page components render to a width constrained by the viewport and current zoom level.

## Important implementation files

- `src/App.tsx` — provider setup, React Query, routing, and theme provider.
- `src/database/supabase.ts` — Supabase client initialization.
- `src/database/utils.ts` — client-side data helpers for Supabase table queries.
- `src/pages/Index.tsx` — app state manager, auth/subscription checks, and main workflow routing.
- `src/pages/PricingGate.tsx` — subscription gating and initial academic selection.
- `src/components/study/StudyDashboard.tsx` — resource list view and study UI.
- `src/components/study/MixedContentRenderer.tsx` — math and code block rendering.
- `src/pages/PdfViewerPage.tsx` — interactive PDF viewer.

## Notes

- The app is a React Single Page Application that uses local storage for selected academic context and session persistence.
- Supabase is both the auth provider and the database/query layer for the client.
- React Query is used for most application data, while `fetch()` is reserved for custom Edge Function calls.
