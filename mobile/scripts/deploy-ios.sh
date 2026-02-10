#!/bin/bash
set -e

# ─────────────────────────────────────────────────────────────
# Pechi Mobile — iOS Device Deploy Script
# Usage: ./scripts/deploy-ios.sh [--skip-build] [--device <ID>]
# ─────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
WORKSPACE="$PROJECT_DIR/ios/Pechi.xcworkspace"
SCHEME="Pechi"
BUNDLE_ID="com.pechi.mobile"
SKIP_BUILD=false
DEVICE_ID=""

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build) SKIP_BUILD=true; shift ;;
    --device) DEVICE_ID="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--skip-build] [--device <DEVICE_ID>]"
      echo ""
      echo "Options:"
      echo "  --skip-build   Skip xcodebuild, only install and launch"
      echo "  --device <ID>  Specify device ID (auto-detected if omitted)"
      echo "  -h, --help     Show this help"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Auto-detect device ──
if [ -z "$DEVICE_ID" ]; then
  echo "🔍 Detecting connected iOS device..."
  DEVICE_ID=$(xcrun devicectl list devices 2>/dev/null \
    | tail -n +3 \
    | grep -v "^$" \
    | head -1 \
    | awk '{for(i=1;i<=NF;i++) if($i ~ /^[0-9A-F]{8}-/) print $i}')

  if [ -z "$DEVICE_ID" ]; then
    echo "❌ No connected iOS device found."
    echo "   Connect your iPhone via USB, unlock it, and trust this computer."
    exit 1
  fi
fi

DEVICE_NAME=$(xcrun devicectl list devices 2>/dev/null \
  | grep "$DEVICE_ID" \
  | awk '{print $1}')
echo "📱 Device: ${DEVICE_NAME:-unknown} ($DEVICE_ID)"

# ── Prebuild if ios/ doesn't exist ──
if [ ! -d "$PROJECT_DIR/ios" ]; then
  echo "📦 Native project not found. Running expo prebuild..."
  cd "$PROJECT_DIR" && npx expo prebuild --clean
fi

# ── Build ──
if [ "$SKIP_BUILD" = false ]; then
  echo "🔨 Building $SCHEME..."
  xcodebuild \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -destination "id=$DEVICE_ID" \
    -allowProvisioningUpdates \
    build \
    2>&1 | grep -E '(BUILD|error:|\*\*)' | tail -5

  # Verify build succeeded
  if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo "❌ Build failed. Check Xcode signing or run:"
    echo "   open $WORKSPACE"
    exit 1
  fi
  echo "✅ Build succeeded"
else
  echo "⏭️  Skipping build"
fi

# ── Find .app bundle ──
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData \
  -path "*/Pechi-*/Build/Products/Debug-iphoneos/Pechi.app" \
  -type d \
  -maxdepth 5 \
  2>/dev/null | head -1)

if [ -z "$APP_PATH" ]; then
  echo "❌ Pechi.app not found in DerivedData. Run without --skip-build."
  exit 1
fi
echo "📁 App: $APP_PATH"

# ── Install ──
echo "📲 Installing on device..."
xcrun devicectl device install app \
  --device "$DEVICE_ID" \
  "$APP_PATH" 2>&1 | tail -3
echo "✅ Installed"

# ── Launch ──
echo "🚀 Launching $BUNDLE_ID..."
xcrun devicectl device process launch \
  --device "$DEVICE_ID" \
  "$BUNDLE_ID" 2>&1 | tail -2
echo "✅ App launched"

# ── Check if Metro is running ──
if ! lsof -i:8081 > /dev/null 2>&1; then
  echo ""
  echo "⚠️  Metro bundler is not running. Start it in another terminal:"
  echo "   cd $PROJECT_DIR && npx expo start --dev-client"
fi
