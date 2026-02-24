

## Show More/Less for Presets and Advisors in Settings

Add a "Show More" toggle to both the Quick Presets and Advisors lists in Settings, displaying only the first 6 items by default and revealing the rest when expanded.

### Changes

**`src/components/tabs/SettingsTab.tsx`**

1. **Quick Presets section (around lines 721-735)**
   - Add state: `showAllPresets` (default `false`)
   - Slice `settings.presets` to first 6 when collapsed
   - Add a "Show More (N)" / "Show Less" button below the list when there are more than 6 presets

2. **Advisors section (around lines 752-761)**
   - Add state: `showAllAdvisors` (default `false`)
   - Slice `settings.advisors` to first 6 when collapsed
   - Add a "Show More (N)" / "Show Less" button below the list when there are more than 6 advisors

### Technical Details

- Two new `useState<boolean>` hooks in the `SettingsTab` component
- The toggle buttons will use `ChevronDown`/`ChevronUp` icons already imported
- Pattern: `const visiblePresets = showAllPresets ? settings.presets : settings.presets.slice(0, 6)`
- The "Show More" button displays the count of hidden items, e.g., "Show More (4)"

