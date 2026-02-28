# Fix "Unable to load script" on Android

This error means the app on your **phone/emulator** cannot download the JavaScript bundle from the **Metro bundler** on your computer.

## Checklist (do in order)

### 1. Start Metro on your Mac

From the project root (where `package.json` is):

```bash
cd /Users/gopalakrishnachennu/Desktop/Devops/splitwise/splitwise
npx expo start
```

Leave this terminal open. You should see something like:

- `Metro waiting on exp://192.168.x.x:8081` (or port 8082).

Note the **IP** and **port** (usually **8081**).

---

### 2. Same Wi‑Fi

- Your **Android device** and your **Mac** must be on the **same Wi‑Fi network**.
- If you use a **USB‑connected phone**, you can use `adb reverse` (step 4) so the phone uses your Mac’s Metro.

---

### 3. Use a development build (not Expo Go) if you built the app with `expo run:android`

- If you installed the app via `expo run:android` or a built APK, it’s a **dev client** and it **must** load the bundle from Metro.
- After opening the app, it may ask for a URL or try to connect automatically. If it shows "Unable to load script", Metro isn’t reachable (see steps 1, 2, 4).

---

### 4. Port forwarding (USB‑connected phone)

If the phone is connected with **USB**:

```bash
adb reverse tcp:8081 tcp:8081
```

If Metro is on a different port (e.g. 8082):

```bash
adb reverse tcp:8082 tcp:8082
```

Then **reload the app** (shake device → Reload, or close and reopen the app).

---

### 5. Firewall

- On your **Mac**, allow incoming connections for **Node** or **Metro** on port **8081** (or the port Metro uses).
- **System Settings → Network → Firewall** (or **Security & Privacy → Firewall**) and allow your terminal/Node.

---

### 6. Clear cache and try again

```bash
npx expo start --clear
```

Then on the phone: reload the app or reopen it.

---

### 7. Confirm Metro port

If you previously chose a different port (e.g. 8082), the app might still be trying 8081. Start Metro on the default port:

```bash
npx expo start --port 8081
```

Then run `adb reverse tcp:8081 tcp:8081` and reload.

---

## Quick test

1. **Mac:** `npx expo start` (wait until it says "Metro waiting on…").
2. **Phone (USB):** `adb reverse tcp:8081 tcp:8081`.
3. **Phone:** Open the Splitwise app and wait (or shake → Reload).

If it still shows "Unable to load script", check the **Metro terminal** for any errors when the app opens, and that the IP/port in the Metro message match what the app would use (for USB, the app often uses `localhost:8081` thanks to `adb reverse`).
