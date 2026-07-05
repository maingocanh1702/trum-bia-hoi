#!/usr/bin/env bash
# commit-local.sh — stage CHỈ các file chỉ định (per-file, KHÔNG `git add -A`), commit. KHÔNG push.
# Bản no-remote của payment bot `commit-push.sh` cho Trum Bia Hoi (repo chỉ local, không có origin).
#
# Usage:
#   bash scripts/commit-local.sh "type(scope): mô tả" <file1> [file2 ...]
#
# Ví dụ:
#   bash scripts/commit-local.sh "docs(engine-core-loop): tracker after merge" docs/implementation-tracker.md SESSION-TRACK-LOG.md
set -euo pipefail

msg="${1:?Cần commit message: \"type(scope): mô tả\"}"; shift
[ "$#" -ge 1 ] || { echo "❌ Cần ít nhất 1 file để stage (KHÔNG add -A)."; exit 1; }

# Phải ở trong git repo
root="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "❌ Không phải git repo."; exit 1; }
cd "$root"

# Single git-writer: lock = có writer khác → DỪNG
if [ -f .git/index.lock ]; then
  echo "❌ .git/index.lock tồn tại — có git writer khác (autopilot/session?). DỪNG."
  echo "   Nếu chắc chắn lock cũ/treo: kiểm tra rồi xoá thủ công 'rm .git/index.lock'."
  exit 1
fi

# Stage per-file (KHÔNG add -A)
for f in "$@"; do
  [ -e "$f" ] || { echo "❌ Không thấy file: $f"; exit 1; }
  git add -- "$f"
done

echo "=== Sẽ commit các thay đổi sau ==="
git status --short -- "$@"
echo "=== Review diff (đã staged) ==="
git --no-pager diff --cached --stat -- "$@"

git commit -m "$msg"
echo "✅ Đã commit local (no push — repo không có remote): $(git rev-parse --short HEAD)"
