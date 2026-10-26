# Updates

`dsh-ollama-web` includes three related controls:

1. **Check for updates** — compare the installed `dsh-ollama-web` version with
   the latest npm release.
2. **Install update** — download, verify and replace the installed package,
   with rollback on a failed swap and journal recovery after a crash.
3. **Auto-update** — an opt-in background check every six hours that installs a
   newer release in the same major version.

Search itself is unchanged. Update operations do not use the Ollama API key,
search query, session content or workspace files.

## Where the controls are

- **Plugins -> `dsh-ollama-web` -> Configure** shows the **Updates** section
  below the search settings.
- The bundle detail page for `dsh-ollama-web` shows the same section through
  `plugins.detail.section`, followed by the support card.

The section displays the running/installed version, the latest release, the
last check time, the auto-update switch, release notes and the npm provenance
link.

## Checking

The host reads the npm registry packument for `dsh-ollama-web`:

- primary: `https://registry.npmjs.org/`
- fallback: `https://registry.npmmirror.com/`

Metadata is capped at 256 KiB and 10 seconds, redirects are refused, and only
HTTPS registries and tarball hosts are accepted. There is no second package to
compare, so a release is either usable or rejected as invalid metadata.

The updater honors the profile's `pnpm-workspace.yaml` `minimumReleaseAge`
(minutes) **only when the profile explicitly sets a non-zero integer**. When the
setting is absent, unreadable or invalid, the updater uses 0 minutes (no wait);
`minimumReleaseAge: 0` also disables the wait. A release that is newer than an
explicitly configured age is shown as **waiting for the minimum release age**;
it is not installed by the button or by auto-update until the eligible time.

A check caches its result for one hour. **Check for updates** always performs a
fresh check. Opening the card reads the cached host state, and when the last
successful check is older than five minutes it also performs a fresh check in
the background. Within those five minutes it does not contact the registry.

## DSH compatibility

Each release declares the DSH versions it supports in `engines.dsh` (for
example `>=0.2.1-rc.1 <0.3.0`). The host reads that range from the packument
and compares it with the running DSH version from `DSH_CLIENT_VERSION`
(desktop) or `DSH_APP_VERSION` (other deployments).

- **Compatible** — the release may be installed manually or by auto-update.
- **Incompatible** — the card shows **this release does not support the
  running DSH version**, does not offer Install, and auto-update skips it.
- **Unknown** — the release has no `engines.dsh`, the range cannot be parsed,
  or the host cannot determine the DSH version. Auto-update pauses; the explicit
  Install button remains available for a deliberate manual update.

The updater evaluates only the npm `latest` release. It does not search older
releases for a compatible fallback. If the latest release is incompatible,
update DSH first or install a compatible version through the CLI. The tested
DSH matrix remains in [COMPATIBILITY.md](COMPATIBILITY.md).

## Installing

**Install update** first re-checks the registry, then:

1. downloads one tarball (16 MiB / 60 seconds);
2. verifies `dist.integrity` (SHA-512 SRI) from the npm metadata;
3. extracts only regular files/directories under `package/`, rejecting symlinks,
   hardlinks, devices, absolute paths, `..` segments, duplicate entries and
   oversized files;
4. validates the package name/version, the DSH bundle patch, the web client
   declaration, the `./client` export and the required files (`dist/index.js`,
   `client.js`, `cordis.patch.yml`);
5. copies the installed `node_modules` into the staged copy and checks that the
   new manifest's dependencies still resolve;
6. renames each installed directory to a hidden backup and moves the staged
   directory into place. If any target fails, every earlier target is restored;
7. after a successful swap, rewrites the profile `package.json` dependency when
   it is an exact version at or below the installed version, then reads the
   `pnpm-lock.yaml` importer and reports any stale lock.

A failed check, download, verification or swap leaves the installed version in
place. A journal written before the swap lets the next host start roll back an
interrupted package replacement to the previous directory. The updater does not
run npm, pnpm or any package lifecycle script.

Each profile allows one install at a time. The host writes a mode-0600
`update.lock` under `<profile>/data/dsh-ollama-web/`; a second host either
reports `busy` or, after a crash, reclaims a lock whose PID is dead or whose
mtime is older than 15 minutes.

### Backups

Successful swaps keep hidden `.dsh-ollama-web-bak-*` directories next to the
installed package. They are removed after the new host starts and confirms that
the on-disk version matches the running version. If the new code fails to load,
the backup remains for manual recovery. Reinstall through **Plugins** or the CLI
is the simplest recovery path.

## Restart

The host process keeps the code it already loaded. After an install, restart
DSH. In the desktop app, quit and reopen DeepSeek Harness. The section shows a
restart notice until the new version is running. The installed package contains
both the host code and `client.js`; a page refresh alone does not update the
host.

## Auto-update

Auto-update is **off by default**. Enabling it is an explicit trust decision: it
can install new code without a further prompt.

When enabled:

- the first pass runs shortly after startup (60 seconds plus jitter) and the
  service then checks every six hours while the host is running;
- only a newer **same-major** release whose `engines.dsh` accepts the running
  DSH version is installed automatically;
- major updates require the explicit **Install update** button;
- an explicitly configured `minimumReleaseAge` and linked installs stop
  automatic installation;
- if the running DSH version cannot be determined, or the release has no usable
  `engines.dsh`, automatic updates pause; the card explains why and the explicit
  **Install update** button remains available for a manual update;
- a release known to exclude the running DSH is shown as incompatible and is
  not installed by either path;
- when an age is configured and the publish time is missing or invalid,
  automatic updates are paused but the explicit **Install update** button remains
  available; the card reports that automatic updates are paused. When no age is
  configured, an unknown publish time does not block automatic updates;
- the preference is stored per profile in
  `<profile>/data/dsh-ollama-web/update-prefs.json`.

The background pass records its outcome in
`<profile>/data/dsh-ollama-web/update-state.json`; the card shows the last error
or restart state. The state file uses schema 2; a 1.x schema-1 file is read and
mapped to the single-package shape.

## Profile records

DSH 0.2.1 has no update API for third-party bundles. The updater therefore
replaces the installed package directory directly rather than running the
Profile Manager's remove/install flow.

After a successful swap:

- the running and on-disk package version changes immediately;
- when the profile `package.json` records an exact version at or below the
  installed version, the updater atomically rewrites that one dependency value
  to the new version. Other manifest fields are preserved. An exact pin newer
  than the installed copy is left unchanged and reported;
- a range, `file:` / `link:` specifier or missing dependency is left unchanged
  and reported;
- `pnpm-lock.yaml` is **not** rewritten. The updater reads the pnpm v9 importer
  and reports a stale lock instead of editing it by hand. This keeps the
  existing guarantee that the updater never runs pnpm or a lifecycle script.
- `UpdateStatus.records` carries `declaredSpecifier`, `declaredVersion`,
  `lockedVersion`, `mismatch` and `message`. The update card shows a warning
  with the recorded and installed versions, and the host writes the same
  diagnostic to its log.

A later normal `pnpm install` resolves the new exact version and refreshes the
lockfile. `pnpm install --frozen-lockfile` fails with an outdated-lockfile error
instead of silently installing the old version. To refresh the records
explicitly:

```bash
cd ~/.dsh/profiles/<profile>
pnpm install --lockfile-only
```

If the manifest uses a range and was left unchanged, reinstall the exact version
through **Plugins** or the CLI so the lockfile and manifest match the running
copy.

The manifest write uses the updater's per-profile update lock, not the Profile
Manager's pnpm lock. Do not run a concurrent package operation while an update
is being applied.

Manual commands for a non-desktop profile:

```bash
dsh plugin --profile <profile> remove dsh-ollama-web
dsh plugin --profile <profile> add dsh-ollama-web@2.5.0
```

The desktop profile is managed by the Electron app; use **Plugins** there.

## Upgrading from 1.x

2.0.0 merges the former `dsh-ollama-web-client` package into
`dsh-ollama-web`. Remove the old package before installing 2.5.0:

```bash
dsh plugin --profile <profile> remove dsh-ollama-web-client
dsh plugin --profile <profile> add dsh-ollama-web@2.5.0
```

The 1.x updater reads packuments for both old packages and only installs
releases in the current major. Because 2.0.0 is not published as a new
`dsh-ollama-web-client`, 1.x will not move you to 2.0.0; the upgrade is manual.
In the desktop app, remove the `dsh-ollama-web-client` bundle in **Plugins**,
then update `dsh-ollama-web`.

Leaving the old client package installed while running 2.0.0 can register the
settings card twice and is not supported. The 2.0 host logs a warning at startup
when it detects the legacy package.

## Bootstrap

1.0.x has no updater. The first release with these controls is 1.1.0, so it must
be installed manually. Current releases install the single package:

```bash
dsh plugin --profile desktop add dsh-ollama-web@2.5.0
```

After that, later 2.x releases can be installed from the card or by
auto-update.

If the profile sets a pnpm `minimumReleaseAge` (the desktop profile currently
sets 60 minutes), a just-published bootstrap version can be held back by pnpm.
This is a profile setting, not an updater default; remove it or set it to `0` to
disable the wait. Otherwise, wait for the age to pass, add exact-version
`minimumReleaseAgeExclude` entries temporarily, or pass
`--config.minimum-release-age=0` to the explicit bootstrap install. That
override applies only to the command; the profile setting stays unchanged, and
later updater checks still respect it.

## Linked installs

A `link:` dependency that resolves outside the profile, or any installed package
directory outside `$DSH_HOME/profiles`, is reported as **linked**. The updater
never modifies it. (A `file:` tarball copied into the profile is a normal
installed copy and can be updated.) Run `pnpm build` in the repository and
reload DSH for development changes.

## Egress and security

- Only the package name `dsh-ollama-web` is sent to the update registry. The API
  key, queries, sessions, workspace files and settings are not included.
- The client bundle makes no external network request. It calls the host through
  DSH's authenticated same-origin Connection RPC (`/ollama-web-update`).
- The update RPC accepts no version, URL, path or spec from the browser. It only
  accepts the method's own booleans.
- HTTPS, redirect refusal, response caps, SHA-512 integrity, safe extraction and
  atomic rollback are the update boundary. A compromised registry or npm
  account is outside that boundary; npm provenance can be checked separately
  with `npm view ... dist.attestations`.
- Auto-update is opt-in and limited to the current major version.

## Failure codes

| Code | Meaning |
|---|---|
| `network`, `timeout` | Registry or tarball unavailable |
| `registry-status`, `registry-json` | Registry answered with an error or invalid metadata |
| `integrity` | Tarball did not match the npm SHA-512 integrity |
| `archive` | Invalid, unsafe or oversized archive |
| `package-invalid` | Missing files, wrong manifest, missing client half or unresolved dependency |
| `linked` | Development/link install; update it from Git |
| `no-install`, `no-profile` | Package or profile not found |
| `permission` | The installed directory could not be replaced |
| `install-failed` | A swap failed and was rolled back |
| `state-write` | Update state/preferences could not be stored |
| `age-limited` | The release is newer than the configured `minimumReleaseAge` |
| `incompatible-dsh` | The release's `engines.dsh` excludes the running DSH version |
| `major-blocked` | Auto-update refused a major version |
| `no-update` | Nothing newer is available |
| `busy` | Another update operation is running |
