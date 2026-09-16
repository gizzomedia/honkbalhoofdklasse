#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
: "${SWIFT_COMPILER:?Set SWIFT_COMPILER to the Swift 6.4 swiftc executable}"
: "${SWIFT_WASM_SDK:?Set SWIFT_WASM_SDK to the SDK wasm32-unknown-wasip1 directory}"
python3 "$ROOT/scripts/generate-franchise.py"
OUTPUT="${FRANCHISE_OUTPUT:-$ROOT/public/franchise/franchise.wasm}"
mkdir -p "$(dirname "$OUTPUT")"
TEST_FLAGS=(-D WEB_RELEASE)
if [ "${FRANCHISE_TEST_BUILD:-0}" = 1 ]; then TEST_FLAGS=(-D PORT_TEST); fi
"$SWIFT_COMPILER" -O -swift-version 5 -parse-as-library "${TEST_FLAGS[@]}" \
  -module-cache-path "$ROOT/game-runtime/.build/module-cache" \
  -target wasm32-unknown-wasip1 -sdk "$SWIFT_WASM_SDK/WASI.sdk" \
  -resource-dir "$SWIFT_WASM_SDK/swift.xctoolchain/usr/lib/swift_static" -static-stdlib \
  "$ROOT"/game-runtime/Adapter/*.swift "$ROOT"/game-runtime/Generated/*.swift "$ROOT/game-runtime/Entry.swift" \
  -Xclang-linker -resource-dir -Xclang-linker "$SWIFT_WASM_SDK/swift.xctoolchain/usr/lib/clang" \
  -Xclang-linker -mexec-model=reactor \
  -Xlinker --export=hk_alloc -Xlinker --export=hk_free -Xlinker --export=hk_dispatch -Xlinker --export=hk_result_length \
  -Xlinker --strip-all -Xlinker -z -Xlinker stack-size=4194304 \
  -o "$OUTPUT"

python3 - "$OUTPUT" <<'PYCODE'
import gzip,sys
from pathlib import Path
p=Path(sys.argv[1]);p.with_suffix('.wasm.gz').write_bytes(gzip.compress(p.read_bytes(),mtime=0))
print('Browser engine:',p.stat().st_size,'bytes;',p.with_suffix('.wasm.gz').stat().st_size,'bytes compressed')
PYCODE
