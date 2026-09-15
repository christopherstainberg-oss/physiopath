# Jeffery hospital overlay — shipped shape (picks 1+2+3)

Educational only. Not a clinician.

Gated to **ICU-AW / stroke / clinician-prescribed telemetry**. Outpatient HOAC/SINSS/ICF/FITT-VP stays for everything else.

Stop-rules use **clinician telemetry only** (ABOVE or BELOW prescribed range). No traffic-light colours.

Live string: `buildCoachSystem()` in `src/ui/4-coach-boot.js`. Tests: `test/coach-prompt.test.mjs`.

Research: `docs/2026-09-15-acute-hospital-ebp-research.md`
