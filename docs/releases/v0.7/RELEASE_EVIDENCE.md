# v0.7.0 Closed-Beta Candidate

Generated: 2026-10-19 (Asia/Jakarta)  
Source commit: `47a280d` (`fix(security): bind practice capture to review`)  
Artifact: `release/moodlens-v0.7.0.zip` (ignored build output; regenerate locally)

## Integrity

- SHA-256: `254cfb226e6d18f7f4b393519a5c97485a84a60f0743cdb2b46146267aebc46e`
- Size: 157,150 bytes
- ZIP entries: 14 (12 files and 2 directory entries)
- Manifest at ZIP root: yes
- Manifest version: `0.7.0`
- Static host permissions: none
- Optional host permission: `https://*/*`

## Commands observed

- `npm run release:zip`: passed; this ran lint, formatting, typecheck, tests and production build before packaging.
- `shasum -a 256 release/moodlens-v0.7.0.zip`: matched the checksum above.
- `unzip -Z1 release/moodlens-v0.7.0.zip`: only packaged runtime files, icons and local UI assets; no fixtures, source maps, preview harness or store media.
- `npm audit --omit=dev`: 0 vulnerabilities.
- `npm audit`: 0 vulnerabilities.

## Clean-profile Chrome smoke test

Chrome 154 loaded the final `dist/` through the DevTools `Extensions.loadUnpacked` command in a temporary clean profile. The Moodlens service worker reported manifest version `0.7.0`, an empty initial site registry and zero registered content scripts before permission. No Moodlens runtime exception or error log was observed.

The real packaged side panel completed all three onboarding steps after switching from English to Indonesian at a 320×800 viewport. Every step and the initial Today dashboard had `scrollWidth === clientWidth === 320` with no element crossing the viewport boundary. The temporary profile was deleted after the run.

This is unpacked-build and layout evidence only. The optional host request was not approved by a real user in that temporary profile, so the reachable public Moodle 5.3 demo was not counted as enabled-site or beta acceptance evidence.

## Store upload set

- Extension ZIP: regenerate with `npm run release:zip`, then compare its SHA-256 with this file.
- Listing text and dashboard answers: `docs/releases/v0.7/STORE_LISTING.md`.
- Icon, promo and bilingual screenshots: `store-assets/`.
- Public policy targets: `PRIVACY.md` and `WHAT_WE_NEVER_DO.md` after the local commits are pushed.
- Security evidence: `docs/releases/v0.7/SECURITY_REVIEW.md`.

## Proof boundary and external gates

This proves the local source/build/package candidate only. It does not prove Chrome Web Store upload or approval, CI on the unpublished commits, trademark permission, authenticated QA on three Moodle sites, ten beta testers, or seven P0/P1-free days. Do not create the final `v0.7.0` tag until the publication decision and exact uploaded ZIP are confirmed.
