# Microsoft Store

Vraki Language has been on the Microsoft Store since 2017:
**[apps.microsoft.com/detail/9P41XHS4HMLX](https://apps.microsoft.com/detail/9P41XHS4HMLX)** (or `ms-windows-store://pdp/?productid=9P41XHS4HMLX` from Windows).

## Keeping the Store identity out of git

The same rule as [Deo's LED Matrix Manager](https://github.com/Deovandski/Deo-s-Framework16-LED-Matrix-Manager/blob/main/docs/STORE.md): the identity values aren't secrets (Windows shows them for every installed package), but they don't need to be in the repository.

The values come from **Partner Center › Vraki Language › Product identity**: `Package/Identity/Name`, `Package/Identity/Publisher` and `Package/Properties/PublisherDisplayName`.

- `legacy/Vraki Language/Package.appxmanifest` is committed with a **development identity** (`VrakiLanguage.Dev`, `CN=VrakiLanguageDev`) so the project opens and runs from Visual Studio.
- `packaging/store-identity.json` holds the real values. It's in `.gitignore`. Create it from [`packaging/store-identity.example.json`](../packaging/store-identity.example.json).
- Signing keys (`*.pfx`, `*.cer`), `Package.StoreAssociation.xml` and Store packages (`AppPackages/`, `*.appxupload`, `*.msixupload`, …) are ignored too.
- The **Store identity guard** job in CI fails if the committed manifest's identity is anything other than the development one.

In 2017 this was done by hand (a `Note.txt` beside the Store files said to run `git update-index --skip-worktree` on the manifest and the project file). The guard replaces that.

## Building a Store package of the 2017 app

You only need this to resubmit the legacy app. The planned modern app will get its own packaging, like the LED Matrix Manager's `tools/Build-StorePackage.ps1`.

1. Open `legacy/Vraki Language.sln` in Visual Studio with the **Universal Windows Platform development** workload (see [`legacy/README.md`](../legacy/README.md)).
2. **Project › Publish › Associate App with the Store…**, sign in, and pick *Vraki Language*. Visual Studio writes the Store identity into `Package.appxmanifest` and creates `Package.StoreAssociation.xml` (ignored).
3. **Project › Publish › Create App Packages…** for the Store. The output goes to `AppPackages/` (ignored).
4. Before committing anything else, put the development identity back:
   ```powershell
   git restore "legacy/Vraki Language/Package.appxmanifest"
   ```
   `git status` should never list `packaging/store-identity.json`, a `.pfx`, or a changed `Package.appxmanifest`.
