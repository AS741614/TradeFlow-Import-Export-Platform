# Task Checklist - Phase 15C: Polish Navigation, Dashboard, Business Plan, Auth, and Activity Log

## Step 1: Layout & Navigation Shell
- [ ] Modify `src/lib/constants.ts` (Add Activity Log to NAV_ITEMS)
- [ ] Create `src/components/layout/AppLayoutShell.tsx` (Root client layout router/shell)
- [ ] Modify `src/app/layout.tsx` (Fetch session + org details server-side, render AppLayoutShell)
- [ ] Modify `src/components/layout/Sidebar.tsx` (Polished layout, collapsible navigation, active highlights, mobile drawer)
- [ ] Modify `src/components/layout/TopBar.tsx` (Hamburger drawer toggle, profile menu details, search placeholder)
- [ ] Checkpoint 1 Verification (npx tsc --noEmit && npm run lint && npm test)

## Step 2: Dashboard & Business Plan Pages
- [ ] Modify `src/app/page.tsx` (Polished dashboard, recent activity feed, quick actions, Card/Badge updates)
- [ ] Modify `src/app/business-plan/page.tsx` (SWOT 2x2 grid, editor tabs with FormSection/FormField, progress bar)
- [ ] Checkpoint 2 Verification (npx tsc --noEmit && npm run lint && npm test)

## Step 3: Auth & Activity Log Pages
- [ ] Modify `src/app/login/page.tsx` (Styled inputs, visible Sign Up redirection link, Google login button)
- [ ] Modify `src/app/signup/signup-form.tsx` (Styled inputs via FormField, signup layout alignment)
- [ ] Create `src/app/activity-log/page.tsx` (Timeline list page, categories filter, pagination footer)
- [ ] Checkpoint 3 Verification (npx tsc --noEmit && npm run lint && npm test)

## Step 4: Final Verification & Visual Checkpoints
- [ ] Final Verification (tsc + lint + test x3 stability + build)
- [ ] Visual verification screenshots using `/browser`
- [ ] Commit & Push changes to remote
