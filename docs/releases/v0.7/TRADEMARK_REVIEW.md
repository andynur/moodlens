# v0.7 Trademark Review

Reviewed 2026-10-19 against Moodle's official [Trademark Guidelines v1.2](https://moodle.com/wp-content/uploads/2024/01/Moodle-Trademark-Guidelines-2023.pdf) and [trademark overview](https://support.moodle.com/support/solutions/articles/80001075428-about-the-moodle-trademark).

## Result

**Moodlens is high risk without written permission.** The guidelines say a third party may not use Moodle's marks, an obvious variation, or a minor derivation containing most of the letters in `MOODLE` as its own product name for similar or compatible software. `Moodlens` contains five of the six letters in `Moodle` in the same order and is a Moodle-compatible product.

The compatibility wording itself can remain nominative: the guidelines permit wording such as “software for the Moodle platform” when it truthfully describes the relationship and does not suggest endorsement. Do not use a Moodle logo, Moodle trade dress, or a university name or logo.

This is a product-risk review, not legal advice or trademark clearance.

## Primary-name release path

Before submitting a store item named Moodlens:

1. Email `trademarks@moodle.com` with the product name, icon, listing copy, independent-project disclaimer and the fact that the extension is free and open source.
2. Ask for written permission to use **Moodlens** as the extension name and “Moodle” in compatibility wording.
3. Save the written response outside the repository and record only the outcome here—never publish private correspondence or contact details.
4. If permission is absent, declined or not received before submission, use the fallback package below.

## Ready fallback package

- **Name:** BelajarLens
- **Tagline:** Your local-first study companion
- **English compatibility line:** Works with Moodle course sites that you choose to enable.
- **Indonesian compatibility line:** Bekerja dengan situs mata kuliah Moodle yang kamu pilih untuk diaktifkan.
- **Disclaimer:** Independent project. Not affiliated with or endorsed by Moodle Pty Ltd or any university.
- **Indonesian disclaimer:** Proyek independen. Tidak berafiliasi dengan atau didukung oleh Moodle Pty Ltd maupun universitas mana pun.

The fallback deliberately excludes Moodle and close derivations from the product name. A web search found no obvious exact-name product on the review date, but that is not a legal trademark search. The owner should run jurisdiction-appropriate clearance before adopting it.

## Activation checklist

- Replace the user-facing product name and tagline in the manifest, side panel, README, policy pages and store copy.
- Regenerate icons, promo art and screenshots with the fallback wordmark.
- Keep the internal package name and storage keys unchanged to avoid data migration.
- Re-run `npm run check --silent`, build the release ZIP and inspect it before submission.
- Keep the independent-project disclaimer and nominative compatibility wording in both locales.
