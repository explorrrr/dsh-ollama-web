# Updates

`dsh-ollama-web` 1.1.0 adds three related controls:

1. **Check for updates** — compare the installed host/client versions with the
   latest npm release.
2. **Install update** — download, verify and replace both installed packages,
   with rollback on a failed swap and journal recovery after a crash.
3. **Auto-update** — an opt-in background check every six hours that installs a
   newer release in the same major version.

Search itself is unchanged. Update operations do not use the Ollama API key,
search query, session content or workspace files.

## Where the controls are

- **Plugins -> `dsh-ollama-web` -> Configure** shows the **Updates** section
  below the search settings.
- The bundle detail page for `dsh-ollama-web` or `dsh-ollama-web-client` shows
  the same section through `plugins.detail.section`.

The section displays the running/installed versions, the latest release, the
last check time, the auto-update switch, release notes and the npm provenance
link.

## Checking

The host reads the npm registry packument for both packages:

- primary: `https://registry.npmjs.org/`
- fallback: `https://registry.npmmirror.com/`

Both packages must advertise the same version; a split release is reported as
`release-mismatch` and is not installed. Metadata is capped at 256 KiB and 10
seconds, redirects are refused, and only HTTPS registries and tarball hosts are
accepted.

The profile's `pnpm-workspace.yaml` `minimumReleaseAge` (minutes) is respected.
When the setting is absent the updater uses 60 minutes. A release that is newer
than that age is shown as **waiting for the minimum release age**; it is not
installed by the button or by auto-update until the eligible time. Set
`minimumReleaseAge: 0` in the profile if immediate installation is required.

A check caches its result for one hour. **Check for updates** always performs a
fresh check. Opening the card only reads the cached host state; it does not
contact the registry.

## Installing

**Install update** first re-checks the registry, then:

1. downloads both tarballs (16 MiB / 60 seconds each);
2. verifies `dist.integrity` (SHA-512 SRI) from the npm metadata;
3. extracts only regular files/directories under `package/`, rejecting symlinks,
   hardlinks, devices, absolute paths, `..` segments, duplicate entries and
   oversized files;
4. validates the package name/version, the DSH bundle patch and the required
   files (`dist/index.js` / `client.js`);
5. copies the installed `node_modules` into the staged copy and checks that the
   new manifest's dependencies still resolve;
6. renames each installed directory to a hidden backup and moves the staged
   directory into place. If any target fails, every earlier target is restored.

A failed check, download, verification or swap leaves the installed version in
place. A journal written before the swap lets the next host start roll back an
interrupted host/client replacement to the previous directories. The updater does not run npm, pnpm or any package lifecycle script.

Each profile allows one install at a time. The host writes a mode-0600
`update.lock` under `<profile>/data/dsh-ollama-web/`; a second host either
reports `busy` or, after a crash, reclaims a lock whose PID is dead or whose
mtime is older than 15 minutes.

### Backups

Successful swaps keep hidden `.dsh-ollama-web-bak-*` directories next to the
installed packages. They are removed after the new host starts and confirms that
the on-disk versions match the running versions. If the new code fails to load,
the backup remains for manual recovery. Reinstall through **Plugins** or the CLI
is the simplest recovery path.

## Restart

The host process keeps the code it already loaded. After an install, restart
DSH. In the desktop app, quit and reopen DeepSeek Harness. The section shows a
restart notice until the new version is running. The client bundle is replaced
at the same time; a page refresh alone does not update the host.

## Auto-update

Auto-update is **off by default**. Enabling it is an explicit trust decision: it
can install new code without a further prompt.

When enabled:

- the first pass runs shortly after startup (60 seconds plus jitter) and the
  service then checks every six hours while the host is running;
- only a newer **same-major** release is installed automatically;
- major updates require the explicit **Install update** button;
- `minimumReleaseAge`, linked installs and unknown release ages stop automatic
  installation;
- when the publish time is missing or invalid, automatic updates are paused but
  the explicit **Install update** button remains available; the card reports
  that automatic updates are paused;
- the preference is stored per profile in
  `<profile>/data/dsh-ollama-web/update-prefs.json`.

The background pass records its outcome in
`<profile>/data/dsh-ollama-web/update-state.json`; the card shows the last error
or restart state.

## Profile records

DSH 0.2.1 has no update API for third-party bundles. The updater therefore
replaces the installed package directories directly rather than running the
Profile Manager's remove/install flow.

Consequences:

- the running and on-disk package versions change immediately;
- the profile's `package.json` and `pnpm-lock.yaml` still record the previous
  version;
- a later pnpm operation may reinstall the recorded version. To make the profile
  records match, reinstall both packages through **Plugins** or the CLI.

Manual commands for a non-desktop profile:

```bash
dsh plugin --profile <profile> remove dsh-ollama-web
dsh plugin --profile <profile> remove dsh-ollama-web-client
dsh plugin --profile <profile> add dsh-ollama-web@1.1.0
dsh plugin --profile <profile> add dsh-ollama-web-client@1.1.0
```

The desktop profile is managed by the Electron app; use **Plugins** there.

## Linked installs

A `link:` dependency that resolves outside the profile, or any installed package
directory outside `$DSH_HOME/profiles`, is reported as **linked**. The updater
never modifies it. (A `file:` tarball copied into the profile is a normal
installed copy and can be updated.) Run `pnpm build` in the repository and
reload DSH for development changes.

## Bootstrap

1.0.x has no updater. The first release with these controls is **1.1.0**, so it
must be installed manually:

```bash
dsh plugin --profile desktop add dsh-ollama-web@1.1.0
dsh plugin --profile desktop add dsh-ollama-web-client@1.1.0
```

After that, later 1.1.x releases can be installed from the card or by
auto-update.

If the profile sets a pnpm `minimumReleaseAge` (the desktop profile uses 60
minutes), a just-published bootstrap version can be held back by pnpm. Wait for
the age to pass, add exact-version `minimumReleaseAgeExclude` entries
temporarily, or pass `--config.minimum-release-age=0` to the explicit bootstrap
install. That override applies only to the command; the profile setting stays
unchanged, and later updater checks still respect it.

## Egress and security

- Only the package names are sent to the update registry. The API key, queries,
  sessions, workspace files and settings are not included.
- The client makes no external network request. It calls the host through DSH's
  authenticated same-origin Connection RPC (`/ollama-web-update`).
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
| `release-mismatch` | Host and client latest versions differ |
| `integrity` | Tarball did not match the npm SHA-512 integrity |
| `archive` | Invalid, unsafe or oversized archive |
| `package-invalid` | Missing files, wrong manifest or unresolved dependency |
| `linked` | Development/link install; update it from Git |
| `no-install`, `no-profile` | Package or profile not found |
| `permission` | The installed directory could not be replaced |
| `install-failed` | A swap failed and was rolled back |
| `state-write` | Update state/preferences could not be stored |
| `age-limited` | The release is newer than `minimumReleaseAge` |
| `major-blocked` | Auto-update refused a major version |
| `no-update` | Nothing newer is available |
| `busy` | Another update operation is running |
