# Run Splitwise app on Android with Android Studio

Your project is **Expo** (React Native). You can run it on an Android emulator or device using Android Studio’s SDK.

---

## 1. One-time setup

### A. Android Studio

- Install **Android Studio** and open it.
- In **Settings/Preferences → Appearance & Behavior → System Settings → Android SDK**:
  - Install **Android SDK Platform** (e.g. API 34).
  - Install **Android SDK Build-Tools**.
  - In **SDK Tools**, enable **Android SDK Command-line Tools** and **Android Emulator**.

### B. Environment variable (recommended)

So the terminal can find the Android SDK:

- **macOS (zsh):** add to `~/.zshrc`:
  ```bash
  export ANDROID_HOME=$HOME/Library/Android/sdk
  export PATH=$PATH:$ANDROID_HOME/emulator
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  ```
- **Windows:** set `ANDROID_HOME` to your SDK path (e.g. `C:\Users\YourName\AppData\Local\Android\Sdk`) and add `%ANDROID_HOME%\platform-tools` to `PATH`.

Then restart the terminal (or run `source ~/.zshrc` on Mac).

### C. Create an emulator (optional)

- In Android Studio: **Tools → Device Manager** (or **AVD Manager**).
- **Create Device** → pick a phone (e.g. Pixel 6) → pick a system image (e.g. API 34) → Finish.
- Start the emulator from Device Manager so it’s running before you run the app.

---

## 2. Run the app from the project folder

From the **project root** (the folder that contains `package.json` and `app.json`):

```bash
cd /Users/gopalakrishnachennu/Desktop/Devops/splitwise/splitwise

# Install dependencies (if you haven’t)
npm install

# Run on Android (emulator or connected device)
npx expo run:android
```

- The first time, Expo will generate the `android/` folder (native project) and then build and install the app.
- If an emulator is running, the app will open there; otherwise it will use a connected USB device (with USB debugging enabled).

---

## 3. Run from Android Studio (optional)

If you want to open and run the native Android project inside Android Studio:

1. Generate the native project once:
   ```bash
   cd /Users/gopalakrishnachennu/Desktop/Devops/splitwise/splitwise
   npx expo prebuild
   ```
   This creates the `android/` (and `ios/`) folders.

2. In Android Studio: **File → Open** → select the **`android`** folder inside your project (e.g. `.../splitwise/android`).

3. Wait for Gradle sync. Then use **Run** (green play) and choose your emulator or device.

**Note:** After changing `app.json` or Expo config/plugins, you may need to run `npx expo prebuild --clean` and then open the `android` folder again.

---

## 4. If something goes wrong

- **“SDK location not found”**  
  Set `ANDROID_HOME` (and on Mac, the `PATH` lines above).

- **“No devices found”**  
  Start an emulator from Android Studio (Device Manager) or connect a phone with USB debugging on.

- **Build fails**  
  Ensure you’re in the project root and run `npm install`, then `npx expo run:android` again. For Android Studio, use **File → Invalidate Caches / Restart** if Gradle acts up.

---

**Short version:** From the project folder run `npm install` then `npx expo run:android`; use Android Studio to create/start an emulator and (optionally) open the `android` folder after `npx expo prebuild`.
