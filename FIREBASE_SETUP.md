# Firebase setup checklist

Use this to configure Firebase Console so Auth and Firestore work correctly.

---

## 1. Password reset – Action URL & authorized domains

The app uses these URLs for password reset links:

| Platform | URL |
|----------|-----|
| **Web** | `https://<your-web-origin>/reset-password` (e.g. `https://yoursite.com/reset-password` or `http://localhost:8081/reset-password`) |
| **Native (iOS/Android)** | `https://<auth-domain>` (e.g. `https://splitx-27952.firebaseapp.com`) so the link is accepted by Firebase; user completes reset in browser then opens the app to log in. |

**Why you see the new-password form twice (and how to fix it):**

By default, the link in the reset email goes to **Firebase’s** page (`project.firebaseapp.com/_/auth/action`). The user enters the new password there, sees “Password changed”, and clicks CONTINUE. They are then sent to **your** app at `/reset-password` **without** the reset code (it was already used on Firebase’s page). Your app then shows “Open the reset link from your email” and the form again — so they are asked to enter the new password twice.

**Fix: make the email link open your app first (one password entry):**

1. **Authentication → Templates**  
   - Open the **“Password reset”** email template.  
   - Find **“Action URL”** (or “Customize action URL”).  
   - Set it to your app’s reset page so the link in the email goes **directly** to your app with the code:
     - **Local:** `http://localhost:8081/reset-password`  
     - **Production:** `https://your-domain.com/reset-password`  
   - Firebase will append `?mode=resetPassword&oobCode=...` to this URL. The user will land on your app once and enter the new password only there.

2. **Authentication → Settings → Authorized domains**  
   - Add every domain where your app runs:  
     - `localhost` (for local web)  
     - Your production domain (e.g. `yoursite.com`)  
   - Do **not** add `splitwise://` here; that’s for native deep links, not a “domain”.

**If you don’t change the template:** Users will reset on Firebase’s page first. When they click CONTINUE and land on your `/reset-password` with no code, your app now shows “Already reset your password? … Go to login” so they don’t have to enter the password again.

---

**Branded email templates:** The repo includes corporate-style, minimalist HTML and plain-text templates for **verification**, **password reset**, and **email change** in the `email-templates/` folder. See `email-templates/README.md` for how to use them in Firebase Console or with Cloud Functions.

---

## 2. Google Sign-In – Android client ID

For **Android** Google sign-in you must create an Android OAuth client and set the client ID in the app.

1. **Google Cloud Console** (same project as Firebase) → **APIs & Services → Credentials**.  
2. **Create credentials → OAuth client ID**.  
3. Application type: **Android**.  
4. Name: e.g. “Splitwise Android”.  
5. Package name: must match `app.json` → `expo.android.package` (e.g. `com.splitwise.app`).  
6. **SHA-1**: Add your signing certificate fingerprint(s):  
   - Debug: `cd android && ./gradlew signingReport` (or from Android Studio).  
   - Release: from your release keystore.  
7. Create the client and copy the **Client ID** (looks like `324385810709-xxxxxxxxxx.apps.googleusercontent.com`).

**In the app:** set the Android client ID via environment variable so it’s not committed:

- Create or edit `.env` (and add `.env` to `.gitignore` if needed):
  ```bash
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=324385810709-xxxxxxxxxx.apps.googleusercontent.com
  ```
- Restart the dev server after changing env.

If `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` is not set, the app uses a placeholder and Google sign-in on **Android** will not work until you set it.

---

## 3. Firestore security rules (per-user + admin)

The repo includes `firestore.rules` that:

- Restrict **users** so each user can read/write only their own document `users/{userId}`.
- Allow **admin** users (where `users/{uid}.role == 'admin'`) to read all `users` for the admin panel.
- Keep other collections (e.g. groups, expenses) readable/writable by authenticated users; you can tighten these further by membership if needed.

**Deploy rules:** Firebase Console → Firestore → Rules, paste the contents of `firestore.rules`, then Publish.

**Making a user admin:** In Firestore, edit the document `users/<that user's uid>` and set the field `role` to `"admin"`. The app reads `user.role` from this document.

---

## 4. (Optional) Admin via custom claims

For stronger admin enforcement you can use Firebase Auth **custom claims** instead of (or in addition to) the `role` field in Firestore:

1. Set the claim (e.g. `admin: true`) in a **trusted** environment (Cloud Function or Admin SDK on a server) after verifying the user should be admin.  
2. In Firestore rules, use `request.auth.token.admin == true` to allow admin-only access.  
3. In the app, you can read `auth.currentUser` and check the token’s custom claims (often after forcing token refresh).

The app currently uses the **document field** `users/{uid}.role == 'admin'` for the admin panel. You can keep that and add custom claims later for rules-only checks if you prefer.
