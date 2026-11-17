# v0.12.15 — 17 November 2026

- Fix imported four-digit years being truncated to two digits (2026 becoming 2020); retain CE/BE two- and four-digit support.
- Include selected underlying conditions and free-text details in EMR problems even when Other is not checked.
- Clinic-configured metabolic adiposity uses the lowest available BMI, body-fat or WHtR subscore in one bucket, without additive penalties.
- BMI >=23 or WHtR >=0.5 caps Metabolic and Body Composition at 79.
- Overall score floors the available-domain mean and caps at 89 when a clinical domain is below 80; individual muscle/recovery scores remain unchanged.
- Updated in-app scoring explanation. Automated date, import, pen-ledger, draft and scoring tests passed.

# v0.12.14 — 7 October 2026

- Preserve prior cumulative clicks when importing partial pen history; reset totals at explicit new-pen markers or a clearly restarted total.
- Continuation totals accumulate only within the current pen, including edits and actual-use cutoff changes.
- Keep five distinct timestamped local snapshots. Body Blueprint saves only after successful Analyze; GLP-1 saves manually.
- Add selected-snapshot deletion and scoped history clearing without clearing the current form. Fresh pages remain blank.
- Automated planner, import, draft, rebalance and scoring regression tests passed.

# v0.12.13 — 7 October 2026

- Editable continuation-plan table with automatic dose and cumulative-click updates.
- Both planners automatically extend a plan when enough clicks remain after editing.
- Patient text uses ordinal numbers, total clicks, and inline near-empty warnings.
- Combined actual history and future plan, per-pen totals, import diagnostics, and date-only CRM from the original start date.
- Two local drafts with timestamps; each fresh page starts empty and drafts are restored explicitly.
- Handgrip and Sit-to-Stand removed. ASMI is used only for muscle scoring.
- Metabolic Insight 7 corrected to ApoB, Lp(a), Vitamin D, Ferritin, FBS, fasting insulin, and hs-CRP.
- Revised clinic-configured scores incorporate relevant behavior; WHO CVD contributes to cardiovascular scoring without repeated BP/smoking.
- Health score display: 90–100 green, 80–89 yellow, 60–79 orange, below 60 red.

See SCORING-REVIEW.md for assumptions and formulas. Automated scoring, planner, import, remaining-capacity, and draft tests passed before packaging. Browser visual verification was not available in this session.
