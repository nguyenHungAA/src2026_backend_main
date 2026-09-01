#!/usr/bin/env bash
set -euo pipefail

archive_path="${1:-}"
if [[ -z "$archive_path" || ! -f "$archive_path" ]]; then
  echo "Usage: CONFIRM_RESTORE=SRC2026_RESTORE pnpm run restore -- <archive>" >&2
  exit 1
fi
if [[ "${CONFIRM_RESTORE:-}" != "SRC2026_RESTORE" ]]; then
  echo "Set CONFIRM_RESTORE=SRC2026_RESTORE to acknowledge replacement of database data" >&2
  exit 1
fi
if [[ -z "${MONGO_URI:-}" ]]; then
  echo "MONGO_URI is required" >&2
  exit 1
fi
if ! command -v mongorestore >/dev/null 2>&1; then
  echo "mongorestore is required" >&2
  exit 1
fi
if [[ ! -f "$archive_path.sha256" ]]; then
  echo "Checksum file is required: $archive_path.sha256" >&2
  exit 1
fi

sha256sum --check "$archive_path.sha256"
restore_archive="$archive_path"
temporary_archive=""

cleanup() {
  if [[ -n "$temporary_archive" && -f "$temporary_archive" ]]; then
    rm "$temporary_archive"
  fi
}
trap cleanup EXIT

if [[ "$archive_path" == *.gpg ]]; then
  if [[ -z "${SRC2026_BACKUP_KEY_FILE:-}" ]]; then
    echo "SRC2026_BACKUP_KEY_FILE is required for encrypted archives" >&2
    exit 1
  fi
  temporary_archive="$(mktemp --suffix=.archive.gz)"
  gpg --batch --yes --decrypt \
    --passphrase-file "$SRC2026_BACKUP_KEY_FILE" \
    --output "$temporary_archive" "$archive_path"
  restore_archive="$temporary_archive"
fi

mongorestore --uri="$MONGO_URI" --archive="$restore_archive" --gzip --drop
echo "Restore completed and checksum verified: $archive_path"
