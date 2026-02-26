# Run the app on a physical Android phone

Your APK is already built at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## Option A: USB (recommended)

1. **On your phone**
   - Enable **Developer options**: Settings → About phone → tap **Build number** 7 times.
   - Enable **USB debugging**: Settings → Developer options → **USB debugging** ON.
   - Connect the phone to your Mac with a USB cable.

2. **In Cursor terminal** (project folder):
   ```bash
   cd /Users/gopalakrishnachennu/Desktop/Devops/splitwise/splitwise
   adb devices
   ```
   You should see your device listed. If it says "unauthorized", unlock the phone and accept the USB debugging prompt.

3. **Install and run**
   ```bash
   adb -d install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```
   (`-d` = use the only connected device; `-r` = replace if already installed.)

4. **Start Metro (so the app can load JS)**  
   In the same project, in another terminal:
   ```bash
   npx expo start
   ```
   Then open the app on your phone. It will connect to Metro on your machine (same Wi‑Fi, or use "Tunnel" in Expo if needed).

---

## Option B: Copy APK to the phone

1. Copy the APK to your phone (AirDrop, Google Drive, email, or USB file copy).
2. On the phone: open the APK file and install (you may need to allow "Install from unknown sources" for the file manager or browser).
3. Start Metro on your Mac:
   ```bash
   cd /Users/gopalakrishnachennu/Desktop/Devops/splitwise/splitwise
   npx expo start
   ```
4. Open the installed app on the phone. It needs to reach your Mac’s Metro server (same Wi‑Fi, or Expo tunnel).

---

## If install via USB fails

- Unplug and replug the cable; unlock the phone and accept the debugging dialog again.
- Run:
  ```bash
  adb kill-server
  adb start-server
  adb devices
  ```
  Then try the `adb install -r ...` command again.
