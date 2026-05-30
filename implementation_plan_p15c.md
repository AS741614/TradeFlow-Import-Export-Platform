# Implementation Plan - Phase 15C: navigation, dashboard, business plan, auth and activity log pages

This plan details the visual and layout polish pass for TradeFlow. We will introduce a centralized client-side shell (`AppLayoutShell`), fix sidebar and topbar integration, clean up inline style attributes across major user-facing surfaces (Dashboard, SWOT matrix, Document Editor, Login, Signup), and build a timeline-based Activity Log page.

---

## User Review Required

> [!IMPORTANT]
> - **Lifting Sidebar State**: The sidebar collapse state will be lifted from `Sidebar.tsx` to `AppLayoutShell.tsx`. This permits the shell to toggle layout margins (`.sidebar-collapsed`) across the main page content and the TopBar header dynamically, resolving the current UI spacing gap bug.
> - **Server-Side Session Hydration**: The root `layout.tsx` will fetch the current NextAuth session and organization name from PostgreSQL database server-side, passing them as static props to the client shell. This eliminates client-side round-tripping for profile headers and avatar initials.
> - **Google OAuth Button Visibility**: The login page will render the Google sign-in trigger cleanly using design system variables, resolving the hidden state without impacting auth callback URLs.
> - **New Page Addition**: A new client-side timeline page (`/activity-log`) will be created to render activity logs dynamically.

---

## Proposed Changes

### Component 1: Layout Shell & Navigation

#### [MODIFY] [constants.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/constants.ts)
- Append `{ label: 'Activity Log', href: '/activity-log', icon: 'activity' }` to `NAV_ITEMS`.

#### [MODIFY] [layout.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/layout.tsx)
- Retrieve session via `auth()` and query organization name via Drizzle.
- Wrap content inside the new client `<AppLayoutShell>` component.

#### [NEW] [AppLayoutShell.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/layout/AppLayoutShell.tsx)
- Co-ordinate `sidebarCollapsed` and `mobileSidebarOpen` layout states.
- Match routes: for `/login`, `/signup`, or `/auth/*`, render centered, raw auth container (isolated from sidebar/topbar). For authenticated routes, render full Sidebar + TopBar grid framework.

#### [MODIFY] [Sidebar.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/layout/Sidebar.tsx)
- Lift `collapsed` state out. Use CSS tokens for alignment, margin-stacks, and transitions.
- Render category sections (Operations, Finance, Outreach, Business, etc.).
- Highlight current routes using `usePathname()`.
- Support standard accessibility keyboard tab cycling and index triggers.
- Support a sliding mobile drawer sheet triggered by the hamburger.

#### [MODIFY] [TopBar.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/components/layout/TopBar.tsx)
- Implement mobile hamburger menu toggle button.
- User profile initials circle matching current user name.
- Render dropdown menu on profile click containing the user's name, organization name, and a "Sign Out" button (triggers NextAuth `signOut`).
- Link notifications bell directly to `/activity-log`.

---

### Component 2: Polishing Key Pages

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/page.tsx) (Dashboard)
- Refactor metric cards and status indicators using `Card` and `Badge` primitives.
- Replace quick action inline styling with design system grid and flex helper classes.
- Retrieve the 10 most recent activity logs from the `/api/activity-log` endpoint and render them as a lightweight list feed.
- Implement CSS progress indicators for stock metrics, completely removing raw inline `style={{}}` margins or dimensions.

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/business-plan/page.tsx) (SWOT & Plan)
- SWOT Matrix layout: Refactor Strengths/Weaknesses and Opportunities/Threats into a strict 2x2 CSS Grid utilizing `Card` primitives and quadrant color badges.
- Wrap Document Editor input fields inside `FormSection` and `FormField` layout components.
- Progress bar: Render real document completion percentage computed from existing storage length criteria.

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/login/page.tsx)
- Style the credentials form using `FormField` primitives.
- Surface the Google login button styled with design tokens.
- Render a clear "Sign Up" navigation text link pointing to `/signup`.
- Avoid hardcoded HSL/Hex codes for error notices, leveraging standard design system variables instead.

#### [MODIFY] [signup-form.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/signup/signup-form.tsx)
- Wrap registration inputs (Name, Email, Password rules, Company Details) with `FormField`.
- Polishing alignments and margins.
- Avoid hardcoded color notices.

#### [NEW] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/activity-log/page.tsx)
- Create timeline list page displaying timestamped activity actions.
- Implement categories filter input controls (e.g. Operations, Outreach, Finance) wrapped in `FormField`.
- Embed pagination footers and loading skeletons.

---

## Verification Plan

### Automated Tests
- TypeScript compiler: `npx tsc --noEmit`
- Linter validation: `npm run lint`
- Test Suites (Run 3 consecutive times): `npm test` (Target: **340+ passing tests** by writing new test cases for `AppLayoutShell` and `/activity-log` pages)
- Production compilation: `npm run build`

### Visual Verification
Using the `/browser` tool, we will spin up the local server, navigate across interfaces, capture screenshots, and store them inside the brain folder:
- **Dashboard**: `dashboard_mockup.png`
- **Sidebar collapse state**: `sidebar_expanded_mockup.png`
- **Mobile layout drawer (375px)**: `mobile_drawer_mockup.png`
- **SWOT Matrix 2x2 grid**: `swot_matrix_mockup.png`
- **Login screen**: `login_mockup.png`
- **Signup screen**: `signup_mockup.png`
- **Activity log**: `activity_log_mockup.png`
