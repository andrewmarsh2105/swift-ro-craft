

## Plan: Add VIN to RO Scan Flow

### 1. OCR Edge Function — extract VIN
- Add `"vehicleVin": "string or null (17-character VIN if visible)"` to the JSON schema in the system prompt in `supabase/functions/ocr-extract/index.ts`.

### 2. State Machine Types — add VIN field
- Add `vehicleVin: string | null` to `ExtractedData` interface in `src/lib/scanStateMachine.ts`.
- Include `vehicleVin` in `mergePageIntoSession` merge logic (same pattern as `vehicleMake`/`vehicleModel`).

### 3. Scan Flow Hook — map VIN from OCR response
- In `src/hooks/useScanFlow.ts`, map `ocrResult.vehicleVin` into `pageExtractedData`.

### 4. Scan Review Screen — add VIN input (compact)
- In `src/components/scan/ScanReviewScreen.tsx`, add a VIN input **below** the Year/Make/Model row within the same Vehicle section. Use a single full-width input with `font-mono`, `maxLength={17}`, auto-uppercase, and `placeholder="VIN (optional)"`. This keeps it clean — one extra row, not cluttered.

### 5. Apply Data — pass VIN to RO
- In `buildApplyData` inside `ScanReviewScreen.tsx`, include `vin` in the vehicle object when present (alongside year/make/model).

### Technical Details
- The VIN field uses the same compact styling as Year/Make/Model inputs
- Auto-uppercases input (VINs are always uppercase)
- `maxLength={17}` enforces standard VIN length
- Placed on its own row below the Year/Make/Model trio to avoid cramping

