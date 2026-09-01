#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${MONGO_URI:-}" ]]; then
  echo "MONGO_URI is required" >&2
  exit 1
fi

if ! command -v mongodump >/dev/null 2>&1; then
  echo "mongodump is required" >&2
  exit 1
fi

backup_root="${SRC2026_BACKUP_DIR:-./backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_root"
archive_path="$backup_root/src2026-$timestamp.archive.gz"

mongodump --uri="$MONGO_URI" --archive="$archive_path" --gzip

if [[ -n "${SRC2026_BACKUP_KEY_FILE:-}" ]]; then
  if ! command -v gpg >/dev/null 2>&1; then
    echo "gpg is required when SRC2026_BACKUP_KEY_FILE is set" >&2
    exit 1
  fi
  gpg --batch --yes --symmetric --cipher-algo AES256 \
    --passphrase-file "$SRC2026_BACKUP_KEY_FILE" \
    --output "$archive_path.gpg" "$archive_path"
  rm "$archive_path"
  archive_path="$archive_path.gpg"
fi

sha256sum "$archive_path" > "$archive_path.sha256"
echo "Backup created: $archive_path"
