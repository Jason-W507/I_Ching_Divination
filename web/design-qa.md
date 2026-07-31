# Design QA

## Evidence

- Source visual truth: `C:\Users\sherl\.codex\generated_images\019fb6f4-8581-77a0-a17d-3589ea871886\exec-a47d9ebe-0461-4082-aaea-c16c3715f4a8.png` (light, 852 x 1856 px) and `C:\Users\sherl\.codex\generated_images\019fb6f4-8581-77a0-a17d-3589ea871886\exec-64760214-9bd3-428b-9db9-12911a40a9ba.png` (dark, 852 x 1856 px).
- Browser-rendered implementation: `implementation-home-light.png`, `implementation-home-dark.png`, `implementation-result-light.png`, and `implementation-result-dark.png`.
- Combined comparison evidence: `design-qa-comparison-home.png` and `design-qa-comparison-dark.png`.
- Browser viewport: 1400 x 1200 CSS px, deviceScaleFactor 1.
- App viewport: iPhone screen measured 393 x 852 CSS px; Pixel 10 measured 427 x 952 CSS px.
- Density normalization: each source mock was downsampled to 393 x 852 px; browser captures are 393 x 852 px at 1x. The combined boards place equal-size source and implementation images side by side.
- State: empty home screen in light and dark themes. The source mock presents the primary action as active despite an empty placeholder; the implementation intentionally disables it until a question is entered.

## Findings

No actionable P0, P1, or P2 differences remain.

- [P3] Runtime chrome changes the outer crop.
  - Location: screen perimeter and top safe area.
  - Evidence: source mocks contain app content only; the Product Design mobile runtime adds calibrated iPhone or Pixel status/navigation chrome.
  - Assessment: expected template-owned infrastructure, not design drift.

- [P3] Empty-state primary action is disabled.
  - Location: `开始起卦` on the home screen.
  - Evidence: the source mock shows an active vermilion button while its field still contains placeholder copy; the implementation uses a disabled neutral state until the user enters a question.
  - Assessment: intentional usability and validation behavior. The active state retains the source vermilion treatment after input.

- [P3] Hexagram labels are smaller in the implementation.
  - Location: upper-right Qian motif.
  - Evidence: both comparison boards show all six authentic line-position labels, but the implementation reduces them to protect the title and theme switch at 393 px width.
  - Assessment: acceptable responsive adjustment; labels remain legible at the full 1x capture.

## Required Fidelity Surfaces

- Fonts and typography: passed. Songti/STSong-style display and classical copy reproduce the editorial hierarchy; sans-serif metadata remains readable at 11-16 px. No clipping or unintended wrapping was observed.
- Spacing and layout rhythm: passed. Brand, cosmological motif, prompt, input, privacy row, and actions preserve the source ordering and proportional whitespace. iPhone and Pixel captures have no horizontal overflow.
- Colors and visual tokens: passed. Light ivory/charcoal/cinnabar and dark indigo/ivory/copper tokens match the two source directions with accessible control contrast.
- Image quality and asset fidelity: passed. The generated concentric-ring raster asset is used at native-quality scale in both themes. Radix icons supply all UI icons; no placeholder imagery remains.
- Copy and content: passed. Simplified UI copy, Traditional classical text, local-only privacy language, source attribution, and professional-advice disclaimer are present.

## Focused Comparison

Separate focused crops were not required: the 810 x 852 side-by-side comparison boards preserve each complete 393 x 852 screen at 1x, and the brand/theme region, question field, privacy row, and primary/secondary actions are all readable at original size. The result screen was inspected separately in light and dark browser captures because it has no source mock.

## Comparison History

1. Initial browser pass found two P2 issues:
   - The single circular theme control did not communicate the selected light/dark pair as clearly as the source.
   - The upper-right hexagram motif lacked the source's six line-position labels.
   - Fix: replaced it with a segmented sun/moon control and added authentic `上爻` through `初爻` labels alongside the Unicode hexagram glyph.
   - Post-fix evidence: `design-qa-comparison-home.png` and `design-qa-comparison-dark.png`.
2. The end-to-end result pass found a P2 product-state issue: a no-changing-line result repeated the same hexagram under a `变卦` label.
   - Fix: no-change results now show one centered primary hexagram and the explicit state `六爻皆静`.
   - Post-fix evidence: browser DOM and successful flow verification after hot reload.

## Interaction And Runtime Verification

- Entered a real question and confirmed the disabled primary action becomes enabled.
- Completed the paced six-line casting animation and reached the layered result screen.
- Confirmed result guidance, full line text, classics expansion, and no-change handling.
- Confirmed local history stores and reopens the completed reading.
- Confirmed share links default to excluding the question; decoded payload contained only version and six line values.
- Opened the generated link in a second tab and confirmed it reproduced the same hexagram while showing `分享者未公开所占之事`.
- Confirmed light/dark theme persistence and iPhone/Pixel 10 layout behavior.
- Browser console errors/warnings checked on main and shared-result tabs: none.
- `npm run check:runtime`: passed.
- `npm run test:logic`: 4 passed.
- `npm run build`: passed.
- `npm run test:sites`: 4 passed.

## Follow-up Polish

- If future visual testing removes the template cursor from captures, regenerate comparison boards without the cursor bubble over the theme switch.

final result: passed
