# Release hardening

This repository is maintained by a single owner. Releases still use PRs and
automated checks, but there is intentionally no required approving review and
no required Environment reviewer: GitHub does not allow authors to approve their
own PRs or deployments, so those gates would deadlock a solo maintainer.

## Solo-maintainer self-review

Every change, including the owner's own changes, goes through a pull request:

1. Read the complete `git diff main...HEAD`, not only the summary.
2. Run `pnpm verify` in the worktree.
3. Confirm the security regression test fails before the fix and passes after.
4. Confirm no secret, new runtime dependency or lifecycle script was added.
5. Confirm README/CHANGELOG and the relevant security docs are updated.
6. Record the rollback path in the PR body.
7. Wait for the required checks, then squash-merge.

The owner may self-merge after those steps. This is a deliberate availability
choice, not an independent review. The residual risk is a missed self-review or
a compromised GitHub/npm account.

## Applied repository settings (2026-10-19)

| Area | Setting | Target |
|---|---|---|
| `main` PR gate | Ruleset `main-protection` | Target default branch; require a pull request with `required_approving_review_count: 0`; require review-thread resolution; no bypass actor |
| `main` checks | Branch protection | Required checks `test (22)`, `test (24)`, `analyze`, `review`; strict up-to-date policy |
| `main` admin | Branch protection | `enforce_admins: true`; no force pushes or deletions; linear history; conversation resolution |
| `main` reviews | Branch protection | No required approving reviews (solo self-merge); CODEOWNERS remains advisory |
| Tags | Ruleset `release-tags` | Target `refs/tags/v*`; restrict creation, update and deletion; owner bypass for self-tagging |
| `npm` Environment | Deployment policy | Custom tag policy `v*`; wait timer 5 minutes; no required reviewers; admins cannot bypass |
| Actions | Repository permissions | Require SHA pinning; allow GitHub-owned actions plus `pnpm/action-setup@*`; default workflow token read-only |
| Secret scanning | Repository security | Secret scanning + push protection on. `secret_scanning_non_provider_patterns` and `secret_scanning_validity_checks` remain disabled: the API accepted the PATCH but GitHub continues to report them disabled for this repository. Revisit through the Security settings UI or an eligible account feature. |
| npm | Trusted publishing | Publisher limited to `release.yml` + `npm` Environment; no `NPM_TOKEN`; 2FA/passkeys on the npm account and GitHub account |

`enforce_admins` and the `main-protection` ruleset prevent direct pushes to
`main` while still allowing the owner to open, self-review and squash-merge a
PR after checks. The tag ruleset owner bypass is required so the same owner can
create the release tag.

Applied IDs and values:

- `main-protection` ruleset: `25364992`; `release-tags` ruleset: `25364998`.
- `main` required checks: `test (22)`, `test (24)`, `analyze`, `review`;
  `strict: true`; `enforce_admins: true`; no required approvals.
- `npm` Environment: `v*` tag policy, 5-minute wait timer, no reviewers,
  `can_admins_bypass: false`.
- Actions: `selected` allowlist with GitHub-owned actions plus
  `pnpm/action-setup@*`; `sha_pinning_required: true`.

Verification: PR #18 was opened before the ruleset was applied, the required
checks passed, and the owner squash-merged it without an approving review. A
second documentation-only PR after the settings change re-verifies that the
Actions allowlist and required checks still work.

## Applying the settings

1. Back up the current rulesets, branch protection, Environment, Actions and
   secret-scanning JSON under `/tmp`.
2. Enable Actions SHA pinning and the selected-actions allowlist; enable the
   secret-scanning options.
3. Add `analyze` and `review` to the `main` required checks.
4. Create the `main-protection` PR ruleset with zero approvals.
5. Create the `release-tags` ruleset with owner bypass.
6. Set the `npm` Environment to the custom `v*` tag policy and a 5-minute wait.
7. Open a small documentation PR and confirm it can be self-merged after the
   required checks. If it is blocked, inspect the ruleset/check names, adjust,
   and retry.
8. Record the final values and the date in this file.

## Verification

```bash
gh api repos/explorrrr/dsh-ollama-web/rulesets
gh api repos/explorrrr/dsh-ollama-web/branches/main/protection
gh api repos/explorrrr/dsh-ollama-web/environments/npm
gh api repos/explorrrr/dsh-ollama-web/actions/permissions
gh api repos/explorrrr/dsh-ollama-web/actions/permissions/workflow
gh api repos/explorrrr/dsh-ollama-web --jq '.security_and_analysis'
```

A release tag must be an ancestor of `main`; the release workflow also checks
this and refuses to publish otherwise.

## Rollback

- Delete the `main-protection` (`25364992`) and `release-tags` (`25364998`)
  rulesets by ID with `gh api -X DELETE`.
- Restore branch protection from the backed-up JSON with `gh api -X PUT`.
- Restore the Environment, Actions and secret-scanning values from the backup.
- If a required check name is wrong, remove that check temporarily, fix the
  workflow, and re-add it.

## Residual risk

- Self-review is not independent. Use a hardware-backed GitHub passkey, npm 2FA
  and least-privilege sessions.
- A compromised owner token can still create a tag and self-merge. Tag rules,
  Environment tag policy and the tag-on-main check reduce accidents and
  unreviewed-commit releases, but cannot defend against a fully compromised
  owner account.
- The updater trusts the npm registry/npmmirror and does not verify Sigstore
  provenance itself; see [SECURITY.md](../SECURITY.md).
