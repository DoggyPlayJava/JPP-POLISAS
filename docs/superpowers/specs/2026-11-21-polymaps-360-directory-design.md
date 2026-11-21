# PolyMaps 360 Directory — Design

## Intent
Give JPP and SUPER_ADMIN_JPP one reliable directory for every campus 360 panorama, including active records, pending/rejected submissions, disabled GitHub-origin records, and uploaded files with no database reference. This supports volunteer panoramic captures with multiple room pins, safe review/edit, and deliberate building panorama selection.

## Goals
- Filter by actual state across directory entries.
- Inspect panorama, building, pins, and provenance in a detail view.
- Let authorized admins edit submission pins while it remains pending.
- Approve only after all map writes succeed; errors must not mark the submission approved.
- Let admins explicitly select the building panorama to display.
- Keep wide panoramas shared by multiple room pins; preserve each pin's yaw/pitch.
- Preserve reversible disabled GitHub-origin values; do not auto-render external registry fallbacks.

## Non-goals
- Delete unreferenced uploads automatically.
- Restore or re-enable GitHub panoramas.
- Change public volunteer capture or storage permissions beyond existing temporary upload flow.

## Approaches
1. Dedicated directory aggregating database records and Storage objects — selected. Covers orphan uploads and lets filters express all states.
2. Extend existing Buildings/Locations and Submissions tabs — rejected; cannot present unreferenced uploads as first-class entries and causes split filtering.

## UX / behavior
Directory rows/cards identify source, status, building, upload time, and pin count. Detail popup previews image and pins. Pending pin edits update submission payload only and keep status pending. Approve publishes panorama + room locations + hotspots as one guarded workflow; any failure leaves submission pending and reports error. Building panorama selection is explicit and writes active building panorama only after confirmation.

## Constraints / calls
Use current React, Supabase, and existing admin-role gate. Preserve existing locale conventions (Malay/English inline translations or locale files). Storage-only files are listed as unused only when no building, location, hotspot, or submission references their object path. Treat hash fragments as viewer metadata, not part of storage object identity. Keep disabled GitHub records identifiable from the reversible backup table.
