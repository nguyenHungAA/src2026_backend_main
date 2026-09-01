#!/usr/bin/env bash
set -euo pipefail

api_origin="${SRC2026_API_ORIGIN:-http://127.0.0.1:3000}"
failures=0

assert_status() {
  local name="$1"
  local expected="$2"
  local url="$3"
  local actual

  actual="$(curl --silent --output /dev/null --write-out '%{http_code}' "$url")"
  if [[ "$actual" == "$expected" ]]; then
    echo "PASS $name ($actual)"
  else
    echo "FAIL $name expected=$expected actual=$actual" >&2
    failures=$((failures + 1))
  fi
}

assert_status "OpenAPI document" "200" "$api_origin/openapi.json"
assert_status "Unknown API route" "404" "$api_origin/api/v1/does-not-exist"
assert_status "Analytics requires authentication" "401" "$api_origin/api/v1/admin/analytics/summary"
assert_status "Pagination limit is bounded" "400" "$api_origin/api/v1/publication?page=1&limit=101"

if (( failures > 0 )); then
  exit 1
fi

echo "API smoke checks passed"
