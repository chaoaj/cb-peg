set -e
echo "CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)"
echo "--- git status ---"
git status --porcelain || true
STATUS=$(git status --porcelain)
if [ -n "$STATUS" ]; then
  echo "Staging and committing local changes..."
  git add -A
  git commit -m "chore: finish peg game UI and responsive tweaks"
else
  echo "No local changes to commit."
fi
echo "Fetching origin..."
git fetch origin --prune
SRC_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Source branch: $SRC_BRANCH"
if git rev-parse --verify main >/dev/null 2>&1; then
  echo "Checking out existing local 'main'"
  git checkout main
else
  echo "Creating local 'main' from origin/main if available"
  git fetch origin main:main || git checkout -b main
fi
echo "Pulling latest origin/main"
git pull --no-rebase origin main || git pull origin main || true
echo "Merging branch '$SRC_BRANCH' into main"
set +e
git merge --no-ff "$SRC_BRANCH" -m "Merge branch '$SRC_BRANCH' into main"
MERGE_EXIT=$?
set -e
if [ $MERGE_EXIT -ne 0 ]; then
  echo "Merge failed with exit code $MERGE_EXIT. Attempting to abort merge."
  git merge --abort || true
  echo "MERGE_FAILED"
  exit $MERGE_EXIT
fi
echo "Pushing main to origin"
git push origin main
echo "DONE"
