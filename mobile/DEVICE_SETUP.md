# Pechi Mobile — iOS Device Setup Guide

## Prerequisites

- **macOS** with [Xcode](https://developer.apple.com/xcode/) installed (26.0+)
- **Node.js** (18+) and npm
- **iPhone** connected via USB
- **Apple ID** (free personal team is sufficient)
- Backend server running (default: `http://localhost:8021`)

## 1. Install Dependencies

```bash
cd qwen_asr/mobile
npm install
```

## 2. Configure Environment

Create a `.env` file in the `mobile/` directory:

```
API_BASE=http://<YOUR_COMPUTER_LAN_IP>:8021
```

Find your LAN IP:
```bash
ipconfig getifaddr en0
```

> **Important:** `localhost` won't work from a physical device. You must use your computer's LAN IP (e.g. `192.168.0.182`).

## 3. Generate Native Projects

```bash
npx expo prebuild --clean
```

This generates the `ios/` and `android/` directories with native code.

## 4. Connect Your iPhone

1. Plug your iPhone into your Mac via USB
2. **Unlock** the phone
3. Tap **Trust** when prompted on the phone
4. Enable **Developer Mode** on iPhone: Settings > Privacy & Security > Developer Mode > ON (requires restart)

Verify the device is connected:
```bash
xcrun devicectl list devices
```

> **Note on device IDs:** `devicectl` shows a CoreDevice UUID (e.g. `94721C5B-AE34-58A6-B8D5-223E969AE41A`), while `xcodebuild` uses a different classic UDID (e.g. `00008110-000E452A3AF2201E`). The deploy script handles this automatically. If building manually, use the xcodebuild UDID (see step 7).

## 5. Configure Code Signing in Xcode

Open the Xcode workspace:
```bash
open ios/Pechi.xcworkspace
```

In Xcode:
1. Click **Pechi** in the project navigator (left sidebar)
2. Select the **Pechi** target
3. Go to **Signing & Capabilities** tab
4. Check **Automatically manage signing**
5. Select your **Personal Team** from the Team dropdown

> If you don't see a team, add your Apple ID in Xcode > Settings > Accounts.

## 6. Install iOS Platform Support (if needed)

If Xcode reports that the iOS version on your device is not supported:

1. Open Xcode > Settings > Platforms
2. Click **"+"**
3. Download the iOS version matching your phone (e.g. iOS 18, iOS 26)

Check what's installed:
```bash
xcodebuild -showsdks
```

## 7. Build and Deploy (Automated)

The deploy script handles building, installing, and launching in one step:

```bash
./scripts/deploy-ios.sh
```

It auto-detects your device using both `xcodebuild` (for building) and `devicectl` (for installing/launching), since they use different device ID formats.

Options:
```bash
./scripts/deploy-ios.sh --skip-build    # Only install and launch (no rebuild)
./scripts/deploy-ios.sh --device <ID>   # Override devicectl ID for install/launch
```

### Manual Build (if needed)

To find your xcodebuild device ID:
```bash
xcodebuild -workspace ios/Pechi.xcworkspace -scheme Pechi -showdestinations 2>/dev/null \
  | grep "platform:iOS, arch:"
```

Then build with that ID:
```bash
xcodebuild \
  -workspace ios/Pechi.xcworkspace \
  -scheme Pechi \
  -destination 'platform=iOS,id=<XCODE_DEVICE_ID>' \
  -allowProvisioningUpdates \
  build
```

Install using the devicectl UUID:
```bash
xcrun devicectl device install app \
  --device <DEVICECTL_UUID> \
  ~/Library/Developer/Xcode/DerivedData/Pechi-*/Build/Products/Debug-iphoneos/Pechi.app
```

## 8. Trust Developer Profile on iPhone

On first install, iOS blocks untrusted developer apps:

1. On iPhone: **Settings > General > VPN & Device Management**
2. Find your Apple Development profile
3. Tap **Trust**

This is a one-time step per developer certificate.

## 9. Start Metro Bundler

```bash
npx expo start --dev-client
```

Metro serves the JavaScript bundle to the app at `http://<LAN_IP>:8081`.

## 10. Launch the App

Either:
- Tap the **Pechi** app icon on your iPhone, or
- From terminal:
  ```bash
  xcrun devicectl device process launch --device <DEVICECTL_UUID> com.pechi.mobile
  ```

The app connects to Metro, loads the JS bundle, and you should see the Pechi UI.

## Troubleshooting

### Device shows `unavailable`
- Unlock the phone and tap Trust
- Enable Developer Mode (Settings > Privacy & Security > Developer Mode)
- Reconnect the USB cable

### `No iOS devices available in Simulator.app`
This is an Expo CLI limitation when no simulator runtimes are installed. Use `xcodebuild` directly instead of `npx expo run:ios --device` (as documented above).

### `Signing requires a development team`
Open `ios/Pechi.xcworkspace` in Xcode and select your team in Signing & Capabilities.

### `Invalid code signature` on launch
Trust the developer profile: iPhone Settings > General > VPN & Device Management > Trust.

### `iOS X.X is not installed`
Install the matching iOS platform in Xcode > Settings > Platforms.

### `No Script URL provided` / App not connecting to Metro
This happens when the app was built on a different network. Rebuild and reinstall:
```bash
./scripts/deploy-ios.sh
```
Then start Metro (`npx expo start --dev-client`) and reopen the app. If still stuck, shake the phone to open the dev menu and manually enter the Metro URL: `http://<LAN_IP>:8081`.

### App shows blank screen or can't connect to Metro
- Ensure Metro is running (`npx expo start --dev-client`)
- Ensure phone and computer are on the **same Wi-Fi network**
- Check that `.env` has the correct LAN IP
- Try shaking the phone to open the dev menu and enter the Metro URL manually: `http://<LAN_IP>:8081`

### `Unable to find a device matching the provided destination specifier`
`xcodebuild` and `devicectl` use different device IDs. Don't use the `devicectl` UUID with `xcodebuild`. Find the correct xcodebuild ID:
```bash
xcodebuild -workspace ios/Pechi.xcworkspace -scheme Pechi -showdestinations 2>/dev/null \
  | grep "platform:iOS, arch:"
```

### Port 8081 already in use
```bash
kill $(lsof -ti:8081)
npx expo start --dev-client
```

## Quick Reference (after initial setup)

Once everything is configured, subsequent runs only need:

```bash
# One command: build + install + launch
./scripts/deploy-ios.sh

# Then in another terminal:
npx expo start --dev-client

# Or skip rebuild for install-only:
./scripts/deploy-ios.sh --skip-build
```

For JS-only changes, just save the file — Metro hot-reloads automatically.
