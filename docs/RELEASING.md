# Releasing

The release pipeline is `.github/workflows/release.yml`, set up the same way as Deo's LED Matrix Manager.

1. Make sure `main` is pushed and CI is green.
2. Write the release notes in `docs/release-notes/<tag>.md` (for example `docs/release-notes/v1.4.0-legacy.md`). If there's no file, GitHub generates notes.
3. Tag and push:
   ```powershell
   git tag v1.4.0-legacy
   git push origin v1.4.0-legacy
   ```
   Or, without a terminal: **Actions › Release › Run workflow**, type the tag, and run it on `main`.
4. GitHub Actions runs the converter tests, zips the 2017 source (`legacy/`, `docs/`, the license and readme) into `VrakiLanguage-<version>-source.zip`, and publishes a GitHub Release with it.

## What gets released

- **The 2017 app** is installed from the [Microsoft Store](https://apps.microsoft.com/detail/9P41XHS4HMLX). GitHub releases of it carry the source only: building it needs Visual Studio's UWP tooling (see [legacy/README.md](../legacy/README.md)), and a sideload package would need a signing certificate.
- **The modern app**, once it exists, will get a build-and-package step here, like the LED Matrix Manager's installer job.

## Versions

- `v1.4.0-legacy`: the 2017 app's source as of its last Store version, 1.4, restored in 2026.

## Historical package

The only built package of the 2017 app that survived is the 1.1.0.0 sideload package from 29 May 2017 (Visual Studio's `_Test` output). It's attached to the `v1.4.0-legacy` release by hand as `VrakiLanguage-1.1.0.0-2017-sideload.zip` and is **not** in git: it carries the Store identity and its signing certificate, which the repository keeps out (see [STORE.md](STORE.md)). Its certificate expired on 30 May 2018, so it's for the record, not for installing.
