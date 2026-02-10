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

You should see your device with state `available (paired)`. Note down the **Identifier** (e.g. `00008110-000E452A3AF2201E`).

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

## 7. Build

Replace `<DEVICE_ID>` with your device identifier from step 4:

```bash
xcodebuild \
  -workspace ios/Pechi.xcworkspace \
  -scheme Pechi \
  -destination 'id=<DEVICE_ID>' \
  -allowProvisioningUpdates \
  build
```

Wait for `** BUILD SUCCEEDED **`.

## 8. Install on Device

```bash
xcrun devicectl device install app \
  --device <DEVICE_ID> \
  ~/Library/Developer/Xcode/DerivedData/Pechi-*/Build/Products/Debug-iphoneos/Pechi.app
```

## 9. Trust Developer Profile on iPhone

On first install, iOS blocks untrusted developer apps:

1. On iPhone: **Settings > General > VPN & Device Management**
2. Find your Apple Development profile
3. Tap **Trust**

This is a one-time step per developer certificate.

## 10. Start Metro Bundler

```bash
npx expo start --dev-client
```

Metro serves the JavaScript bundle to the app at `http://<LAN_IP>:8081`.

## 11. Launch the App

Either:
- Tap the **Pechi** app icon on your iPhone, or
- From terminal:
  ```bash
  xcrun devicectl device process launch --device <DEVICE_ID> com.pechi.mobile
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

### App shows blank screen or can't connect to Metro
- Ensure Metro is running (`npx expo start --dev-client`)
- Ensure phone and computer are on the **same Wi-Fi network**
- Check that `.env` has the correct LAN IP
- Try shaking the phone to open the dev menu and enter the Metro URL manually: `http://<LAN_IP>:8081`

### Port 8081 already in use
```bash
kill $(lsof -ti:8081)
npx expo start --dev-client
```

## Quick Reference (after initial setup)

Once everything is configured, subsequent runs only need:

```bash
# Terminal 1: Start Metro
npx expo start --dev-client

# Terminal 2: Build + install (only if code changed in native layer)
xcodebuild -workspace ios/Pechi.xcworkspace -scheme Pechi \
  -destination 'id=<DEVICE_ID>' -allowProvisioningUpdates build
xcrun devicectl device install app --device <DEVICE_ID> \
  ~/Library/Developer/Xcode/DerivedData/Pechi-*/Build/Products/Debug-iphoneos/Pechi.app

# Launch
xcrun devicectl device process launch --device <DEVICE_ID> com.pechi.mobile
```

For JS-only changes, just save the file — Metro hot-reloads automatically.
