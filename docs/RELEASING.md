# Release guide

## Build and verify

1. Update `extension/manifest.json` when publishing a new extension version.
2. Run the automated and live-site checks in [CONTRIBUTING.md](../CONTRIBUTING.md).
3. Run `python scripts/package_extension.py`. It packages only the approved runtime files, MIT licence, and transit-data notices into `dist/metro-marketplace-<version>.zip`.
4. Extract that archive into a temporary directory and load it unpacked in Chrome for a final check. Verify the settings page, icons, transit data, and attribution.
5. Use the generated archive for the Chrome Web Store or a GitHub release. Do not commit build ZIPs to source control.

The CI workflow checks and builds; it does not deploy the website or publish extensions. Website deployment is described in [web/README.md](../web/README.md).

## Making the repository public

Run a current [Gitleaks](https://github.com/gitleaks/gitleaks) scan of all fetched branches and tags:

```sh
git fetch --all --tags
gitleaks git . --log-opts="--all --full-history" --redact --max-archive-depth=4 --max-decode-depth=3
```

Inspect committed archives and binary assets too: a patch-based history scan cannot read a binary ZIP diff or identify personal details inside images. Review GitHub issues, pull requests, releases, and workflow logs that will become accessible with the repository.

If private images or files were previously tracked, deleting the current copy is not enough. Prepare and verify a separate cleaned clone covering every affected branch and tag before coordinating any replacement of remote history. GitHub can retain cached or pull-request references to older commits; follow [GitHub's history-removal guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) before making the existing repository public.

The public support email and production website domain are intentional public contact information. Use a GitHub no-reply address for commits if you do not want to publish a personal email address.

After publication, enable GitHub secret scanning, push protection, private vulnerability reporting, and required CI checks in repository settings where available. These settings are managed separately from the workflow files.
