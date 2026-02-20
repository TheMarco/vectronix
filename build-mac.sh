#!/bin/bash
# Build VECTRONIX as a signed, notarized universal macOS DMG via Tauri v2.
#
# Usage:
#   ./build-mac.sh                          # uses env vars if set, else prompts
#   APPLE_SIGNING_IDENTITY="..." ./build-mac.sh   # explicit identity
#
# Required env vars for code signing + notarization:
#   APPLE_SIGNING_IDENTITY  — e.g. "Developer ID Application: Your Name (TEAM_ID)"
#   APPLE_ID                — Apple ID email
#   APPLE_PASSWORD          — App-specific password (NOT your account password)
#   APPLE_TEAM_ID           — 10-char team ID

set -euo pipefail

# --- Check signing identity ---
if [ -z "${APPLE_SIGNING_IDENTITY:-}" ]; then
  echo "No APPLE_SIGNING_IDENTITY set."
  echo ""
  echo "Available Developer ID identities in keychain:"
  security find-identity -v -p codesigning | grep "Developer ID" || echo "  (none found)"
  echo ""
  read -rp "Paste signing identity (or press Enter to build unsigned): " APPLE_SIGNING_IDENTITY
  export APPLE_SIGNING_IDENTITY
fi

if [ -z "${APPLE_SIGNING_IDENTITY:-}" ]; then
  echo ""
  echo "Building UNSIGNED universal macOS DMG..."
  echo "(The app will trigger Gatekeeper warnings on other machines.)"
  echo ""
else
  echo ""
  echo "Building SIGNED universal macOS DMG..."
  echo "Identity: $APPLE_SIGNING_IDENTITY"

  # Check notarization credentials
  if [ -z "${APPLE_ID:-}" ] || [ -z "${APPLE_PASSWORD:-}" ] || [ -z "${APPLE_TEAM_ID:-}" ]; then
    echo ""
    echo "Warning: APPLE_ID, APPLE_PASSWORD, or APPLE_TEAM_ID not set."
    echo "The app will be signed but NOT notarized."
    echo "Set all three env vars to enable notarization."
  fi
  echo ""
fi

# --- Build ---
npm run tauri:build

# --- Output ---
DMG_DIR="src-tauri/target/universal-apple-darwin/release/bundle/dmg"
APP_DIR="src-tauri/target/universal-apple-darwin/release/bundle/macos"

echo ""
echo "=== Build complete ==="

if [ -d "$DMG_DIR" ]; then
  echo "DMG: $(ls "$DMG_DIR"/*.dmg 2>/dev/null)"
fi

if [ -d "$APP_DIR" ]; then
  APP_PATH=$(ls -d "$APP_DIR"/*.app 2>/dev/null | head -1)
  if [ -n "$APP_PATH" ]; then
    echo ""
    echo "--- Binary info ---"
    BINARY="$APP_PATH/Contents/MacOS/Vectronix"
    if [ -f "$BINARY" ]; then
      lipo -info "$BINARY" 2>/dev/null || true
    fi

    echo ""
    echo "--- Code signature ---"
    codesign -dv --verbose=2 "$APP_PATH" 2>&1 || true

    if [ -n "${APPLE_SIGNING_IDENTITY:-}" ]; then
      echo ""
      echo "--- Gatekeeper check ---"
      spctl -a -v "$APP_PATH" 2>&1 || true
    fi
  fi
fi
