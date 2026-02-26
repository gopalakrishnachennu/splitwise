# Email templates (Splitwise)

Corporate-style, minimalist HTML email templates for **sign up (verification)**, **forgot password**, and **email change**. They use inline styles for broad client support and Firebase Auth–compatible placeholders.

---

## Firebase variables

Use these in the template body (Firebase replaces them when sending):

| Variable        | Description                          |
|----------------|--------------------------------------|
| `%APP_NAME%`   | Your app’s public name               |
| `%EMAIL%`      | Recipient email                      |
| `%LINK%`       | Action URL (verify, reset, etc.)     |
| `%NEW_EMAIL%`  | New email (email-change only)         |
| `%DISPLAY_NAME%` | User’s display name (if set)       |

---

## Using in Firebase Console

1. Open **Firebase Console** → your project → **Authentication** → **Templates**.
2. Edit the template you need:
   - **Email address verification** → paste content from `verification.html` (see below).
   - **Password reset** → paste content from `password-reset.html`.
   - **Email address change** → paste content from `email-change.html` (uses `%NEW_EMAIL%`).
3. **Subject lines** (suggested):
   - Verification: `Verify your email – %APP_NAME%`
   - Password reset: `Reset your password – %APP_NAME%`
   - Email change: `Confirm your new email – %APP_NAME%`

**Note:** The Firebase template editor may only accept **plain text** in the body. If HTML is not supported:

- Use the **plain-text bodies** in `plain-text-bodies.txt` for copy-paste into Firebase.
- For **full HTML** (branded, buttons, layout), send these HTML templates from your own backend (e.g. Cloud Functions + Nodemailer/SendGrid) and use the Admin SDK to generate the action link and send the email.

---

## Sending HTML via Cloud Functions (optional)

To use the actual HTML files (recommended for a polished look):

1. Use the **Firebase Admin SDK** in a Cloud Function to generate the action link (`auth.generateEmailVerificationLink`, `auth.generatePasswordResetLink`, etc.).
2. Read the matching `.html` file, replace `%LINK%`, `%EMAIL%`, `%APP_NAME%`, `%NEW_EMAIL%` with real values.
3. Send the email with **Nodemailer**, **SendGrid**, or **Firebase Extensions (Trigger Email)**.

The templates are built for a 480px-wide card, system fonts, and your brand color `#1CC29F` for the primary button.

---

## Files

| File                  | Use case                    |
|-----------------------|-----------------------------|
| `verification.html`    | Sign up – verify email      |
| `password-reset.html` | Forgot password             |
| `email-change.html`   | Change email confirmation   |
| `plain-text-bodies.txt` | Plain-text fallback for Firebase |

---

## Design

- **Layout:** Single column, max-width 480px, centered.
- **Style:** Light gray background (`#f4f6f8`), white card, subtle border and shadow.
- **Typography:** System font stack; headings 22px, body 15px, footer 12px.
- **Color:** Primary CTA `#1CC29F`; text `#0f172a` / `#64748b` / `#94a3b8`.
- **Accessibility:** Semantic structure, fallback link below button, readable contrast.
