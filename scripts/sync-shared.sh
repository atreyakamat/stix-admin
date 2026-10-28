#!/usr/bin/env bash
# Re-copies the shop's pure helpers (types, money, pricing, phone, shipping)
# into src/shared. Usage: scripts/sync-shared.sh ../stixnvibes-nv
set -euo pipefail
NV="${1:?path to a stixnvibes-nv checkout}"
SHA=$(git -C "$NV" rev-parse --short HEAD)
for f in types money pricing phone shipping; do
  {
    echo "// Copied from atreyakamat/stixnvibes-nv src/lib/$f.ts ($SHA). Don't edit here:"
    echo "// change it in the shop, then run scripts/sync-shared.sh."
    cat "$NV/src/lib/$f.ts"
  } > "src/shared/$f.ts"
done
echo "Synced from $SHA."
