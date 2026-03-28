# Aurthayon — App Store & Google Play (Capacitor)

The UI is still your React/Vite app; **Capacitor** wraps it in a native shell so you can list it on the stores.

## Windows vs Mac

- **Android:** Full workflow works on **Windows** (Android Studio + `npx cap add android`).
- **iOS:** Xcode, CocoaPods, and App Store upload require a **Mac**. On Windows, `cap add ios` can create the `ios/` folder, but you cannot complete pods or archive until you open the project on a Mac (or use a Mac CI service).

## What you need

| Requirement | Notes |
|-------------|--------|
| **Apple Developer Program** | Paid (annual). Required to publish on the App Store. |
| **Google Play Console** | One-time registration fee. |
| **Mac + Xcode** | Required to build and upload **iOS** binaries. |
| **Android Studio** | For **Android** builds and Play upload (works on Windows/Mac/Linux). |
| **Production API URL** | Set `VITE_API_URL` to your **HTTPS** backend when you run `npm run build:mobile` (not empty — the Vite dev proxy does not exist inside the app). |

## One-time setup (after `npm install`)

From the **project root** (where `package.json` and `capacitor.config.ts` live):

```bash
npm run build:mobile
npx cap add ios
npx cap add android
```

**Important:** the CLI is **`cap`** (Capacitor), not `capp`. If you run `npx capp add android`, npm installs a wrong package and Android is never added.

You can also use:

```bash
npm run cap:add:ios
npm run cap:add:android
```

Commit the generated `ios/` and `android/` folders (standard for Capacitor).

## Environment for store builds

Create `.env.production` (or set vars in CI) **before** `build:mobile`:

```env
VITE_API_URL=https://your-api.example.com
```

Rebuild and sync whenever the web app changes:

```bash
npm run cap:sync
```

## Open native IDEs

```bash
npm run cap:ios       # Xcode (Mac only)
npm run cap:android   # Tries to launch Android Studio
```

### “Unable to launch Android Studio” (Windows)

1. **Install [Android Studio](https://developer.android.com/studio)** (not only command-line tools). First launch: complete the setup wizard and install an **Android SDK** + platform.

2. **Open the project without `cap open`:** start Android Studio → **File → Open** → select the **`android`** folder inside this repo (the one that contains `build.gradle`, not the repo root).

3. **Optional — fix `npm run cap:android`:** set an environment variable to your `studio64.exe` path, then open a new Command Prompt:

   ```text
   CAPACITOR_ANDROID_STUDIO_PATH=C:\Program Files\Android\Android Studio\bin\studio64.exe
   ```

   Common locations on Windows:

   - `C:\Program Files\Android\Android Studio\bin\studio64.exe`
   - `C:\Users\YOUR_USER\AppData\Local\Programs\Android Studio\bin\studio64.exe`

   In **Command Prompt** for one session only:

   ```cmd
   set CAPACITOR_ANDROID_STUDIO_PATH=C:\Program Files\Android\Android Studio\bin\studio64.exe
   npm run cap:android
   ```

In Xcode: set **Signing & Capabilities** (your team), pick a bundle ID if you change `appId` in `capacitor.config.ts`, then **Archive** → upload to App Store Connect.

In Android Studio: **Build → Generate Signed App Bundle** for Play (use Play App Signing).

## bKash / backend

- Set **`BKASH_CALLBACK_BASE_URL`** on the server to your **public web origin** users return to after pay (e.g. `https://bkash-project.vercel.app` or your custom domain).
- Set **`CORS_ORIGIN`** to allow that same origin (and the app’s origin if you use a custom scheme; often the API only talks to HTTPS from the bundled WebView same as the web app).

## Icons & splash

Add your **horizontal logo** at `public/brand/aurthayon-logo.png` before `npm run build:mobile` so it ships in the app bundle.

Replace default launcher icons and splash screens in:

- `ios/App/App/Assets.xcassets`
- `android/app/src/main/res/`

Or use [Capacitor Assets](https://capacitorjs.com/docs/guides/splash-screens-and-icons).

## Store review

Apple may ask whether the app is “just a website.” You’re shipping a **native container** with offline-capable assets and native APIs available; describe payment features and support contact clearly in the listing.
