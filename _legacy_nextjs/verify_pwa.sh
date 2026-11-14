#!/usr/bin/env bash
# Verify PWA assets are present and syntactically valid.
# Run from _legacy_nextjs/ directory.
set -u
FAIL=0

check_file() {
  local path="$1"
  local desc="$2"
  if [ -f "$path" ]; then
    echo "✅ $desc: $path"
  else
    echo "❌ $desc: $path missing"
    FAIL=$((FAIL+1))
  fi
}

check_json() {
  local path="$1"
  if python -c "import json; json.load(open('$path'))" 2>/dev/null; then
    echo "✅ valid JSON: $path"
  else
    echo "❌ invalid JSON: $path"
    FAIL=$((FAIL+1))
  fi
}

check_js() {
  local path="$1"
  if node --check "$path" 2>/dev/null; then
    echo "✅ valid JS: $path"
  else
    echo "❌ invalid JS: $path"
    FAIL=$((FAIL+1))
  fi
}

echo "─── Files present ───"
check_file "public/manifest.json" "manifest"
check_file "public/sw.js"          "service worker"
check_file "public/offline.html"   "offline page"
check_file "public/icon-192.svg"   "icon 192"
check_file "public/icon-512.svg"   "icon 512"
check_file "components/InstallPrompt.tsx" "install prompt"

echo ""
echo "─── Syntax ───"
check_json "public/manifest.json"
check_js   "public/sw.js"

echo ""
echo "─── Integration ───"
if grep -q "InstallPrompt" "pages/_app.tsx"; then
  echo "✅ InstallPrompt wired in _app.tsx"
else
  echo "❌ InstallPrompt not wired"
  FAIL=$((FAIL+1))
fi

if grep -q 'rel="manifest"' "pages/_document.tsx"; then
  echo "✅ manifest link in _document.tsx"
else
  echo "❌ manifest link missing"
  FAIL=$((FAIL+1))
fi

echo ""
if [ "$FAIL" = "0" ]; then
  echo "═══════════════════════════════════════"
  echo "✅ ALL PWA CHECKS PASSED"
  echo "═══════════════════════════════════════"
  echo ""
  echo "Manual browser verification:"
  echo "  1. Open http://localhost:3000 in Chrome"
  echo "  2. DevTools → Application → Manifest (no errors)"
  echo "  3. DevTools → Application → Service Workers"
  echo "  4. Look for install icon in address bar (production only)"
  echo "  5. Lighthouse → PWA audit"
  exit 0
else
  echo "═══════════════════════════════════════"
  echo "❌ $FAIL FAILURE(S)"
  echo "═══════════════════════════════════════"
  exit 1
fi
