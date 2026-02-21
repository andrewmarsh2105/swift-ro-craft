
# Make Date Input Calendar Icons Visible in Dark Mode

## Problem
The native `<input type="date">` calendar picker icons are nearly invisible in dark mode because browsers render them based on the `color-scheme` property, which isn't set for dark mode in this project.

## Solution
Add CSS rules in `src/index.css` to style the native date input calendar icons for dark mode visibility:

1. Set `color-scheme: dark` on the `.dark` class so browsers automatically adjust native form controls (including the calendar icon) for dark backgrounds
2. Add a WebKit-specific rule to explicitly style the calendar picker icon with a light color in dark mode

## Technical Details

### File: `src/index.css`

Add to the `.dark` block (around line 77):
- `color-scheme: dark;` on the `.dark` selector so all native inputs (date, select, etc.) adapt automatically

Add a global rule for extra specificity on WebKit browsers:
```css
.dark input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
}
```

This uses `filter: invert(1)` to flip the dark calendar icon to white, making it clearly visible against dark backgrounds. The `color-scheme: dark` property handles Firefox and other standards-compliant browsers.

No changes to any component files are needed -- this is purely a CSS fix.
