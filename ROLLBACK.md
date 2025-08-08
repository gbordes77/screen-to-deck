Rollback guide

Scope: release v2.0.1

Scenarios

- Revert release branch before merge:
  - Close the PR or force-push a reset on `release/v2.0.1` to previous commit.

- After merge to main and tag pushed:
  1) Revert merge commit on `main`:
     ```bash
     git revert -m 1 <merge_commit_sha>
     git push origin main
     ```
  2) Delete tag if needed:
     ```bash
     git tag -d v2.0.1
     git push origin :refs/tags/v2.0.1
     ```

- Docker/infra deploy rollback:
  - If deployed via Fly/Railway, redeploy previous image/tag.
  - Healthcheck: verify `/health` and `/api/health` return 200.

Operational notes

- All changes for 2.0.1 are additive and low-risk (health endpoint, CI, docs, Dockerfiles, env examples). Safe to revert as a single revert commit.
- No DB migrations included.
