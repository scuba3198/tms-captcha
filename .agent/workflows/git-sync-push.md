---
description: How to sync and push changes to your GitHub fork
---

# Sync and Push Workflow

This workflow ensures your local changes are correctly rebased and pushed to your fork (`origin`) rather than the `upstream` repository.

1. Fetch all remote updates
// turbo
git fetch --all

2. Rebase your local branch on the fork's main
// turbo
git rebase origin/main

3. Stage your changes
git add .

4. Commit your changes
git commit -m "Your descriptive commit message"

5. Push to your fork
// turbo
git push origin main
