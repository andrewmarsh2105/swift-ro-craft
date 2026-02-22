
# UI Polish and Professional Cleanup

After reviewing all screens (Auth, ROs, Summary, Settings, AddRO, NotFound), here are the issues and fixes organized by priority.

---

## 1. Sign-In Page (Auth.tsx) -- Major Overhaul

**Current issues:**
- Plain, generic look with no visual identity -- feels like a template
- Raw HTML inputs instead of proper styled components
- No card container -- content floats on a flat background
- No app icon/logo -- just text
- Missing "Forgot Password?" link (expected by users, looks incomplete without it)
- No subtle branding or visual anchor

**Fixes:**
- Wrap form in a `Card` component with subtle shadow for depth
- Add a wrench/tool icon or the app icon above the title for visual identity
- Use the project's `input-base` class or the `Input` component for consistent styling
- Add a "Forgot Password?" link under the password field (even if just a placeholder toast for now)
- Add a subtle tagline like "Track your hours. Get paid right." below the title
- Add a version or footer line at the bottom ("RO Tracker v1.0") for polish
- Increase spacing between the sign-in/sign-up toggle and the form

---

## 2. Summary Tab Header (SummaryTab.tsx)

**Current issues:**
- The top Tabs ("Summary | Compare") use `rounded-none bg-muted/50` which looks flat and unfinished next to the rest of the polished UI
- The `Select` dropdown for date range sits flush with no visual grouping -- feels disconnected from the date label beside it

**Fixes:**
- Style the `TabsList` with a subtle bottom border and slightly more padding for a cleaner tab bar look
- Group the Select + date label in a small card or bordered container row so they read as one cohesive unit

---

## 3. NotFound Page (NotFound.tsx)

**Current issues:**
- Very plain -- no icon, no personality
- Uses `bg-muted` which is inconsistent with `bg-background` used everywhere else

**Fixes:**
- Change background to `bg-background` for consistency
- Add a search or compass icon above the 404
- Use a `Button` component for the "Return to Home" link instead of a raw anchor

---

## 4. App.css Cleanup

**Current issues:**
- Contains default Vite template CSS (`.logo`, `.logo-spin`, `.read-the-docs`, `.card`) that is never used
- The `#root` styles (max-width, padding, text-align center) actively conflict with the app layout -- they just happen to be overridden by other styles

**Fix:**
- Delete all content from `App.css` or remove the file entirely and its import from `main.tsx` (if imported)

---

## 5. Minor Polish Items

| Location | Issue | Fix |
|----------|-------|-----|
| Auth.tsx | Submit button missing `cursor-pointer` | Add `cursor-pointer` class |
| Auth.tsx | Toggle link ("Sign Up" / "Sign In") has no button cursor either | Already a `<button>` but add explicit cursor |
| SummaryTab.tsx | Export buttons at bottom use raw `<button>` with inline classes | Use `Button` component for consistency |
| SummaryTab.tsx | "Proof Pack" button uses raw `<button>` | Use `Button` with proper sizing |
| SettingsTab.tsx | "Custom" segmented control for pay period is selected but no end dates are shown -- empty state text says to add dates but the placeholder "Day (1-31)" is vague | Add a small info note: "Add at least 2 dates to define your pay cycle" |

---

## Files to Change

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Card wrapper, icon, tagline, Input components, forgot password link, footer |
| `src/pages/NotFound.tsx` | Background fix, icon, Button component |
| `src/App.css` | Remove all unused Vite template CSS |
| `src/components/tabs/SummaryTab.tsx` | Tab styling, Select grouping, Button components for export |
| `src/components/tabs/SettingsTab.tsx` | Better empty state text for custom pay period |
