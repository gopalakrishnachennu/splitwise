# Splitwise App – Testing Checklist (Web, Android, iOS)

Use this list to verify every feature across **Web**, **Android**, and **iOS**.  
Mark each as ✅ Pass / ❌ Fail / ⏭ Skip (e.g. iOS-only).

---

## 1. AUTHENTICATION

| # | Test | Web | Android | iOS | Notes |
|---|------|-----|---------|-----|--------|
| 1.1 | Open app → Login screen shows (email, password, Log In) | | | | |
| 1.2 | Login with valid email/password → lands on Friends tab | | | | |
| 1.3 | Login with wrong password → error message, no navigation | | | | |
| 1.4 | Press Enter in password field → submits login (same as Log In button) | | | | |
| 1.5 | Forgot password → enter email, tap Forgot password → success/error message | | | | |
| 1.6 | Sign up link → opens signup; sign up with email/password → lands on tabs | | | | |
| 1.7 | Email verification: unverified user → redirected to verify-email screen | | | | |
| 1.8 | Resend verification email → alert success | | | | |
| 1.9 | **iOS only:** Continue with Apple button visible and works | | | ✓ | |
| 1.10 | Logout (Account → Log out → confirm) → back to login | | | | |

---

## 2. MAINTENANCE MODE

| # | Test | Web | Android | iOS | Notes |
|---|------|-----|---------|-----|--------|
| 2.1 | **Unauthenticated:** When maintenance ON → login page shows "Under maintenance" (no form) | | | | |
| 2.2 | **Regular user:** When maintenance ON → full-screen "Under maintenance", cannot use app | | | | |
| 2.3 | **Admin:** When maintenance ON → app works normally (no block) | | | | |
| 2.4 | Admin turns maintenance OFF → regular users see app again without reload | | | | |

---

## 3. FRIENDS TAB (HOME)

| # | Test | Web | Android | iOS | Notes |
|---|------|-----|---------|-----|--------|
| 3.1 | Friends list loads (empty or with friends) | | | | |
| 3.2 | Pull to refresh → list refreshes | | | | |
| 3.3 | Tap friend row → opens friend detail (balance, expenses) | | | | |
| 3.4 | Header: Search icon → opens Search | | | | |
| 3.5 | Header: Person-add icon → opens Add friend | | | | |
| 3.6 | "Add expense" FAB → opens Add expense modal | | | | |
| 3.7 | **Android:** Header not under status bar; icons tappable | | ✓ | | Safe area |
| 3.8 | **Android:** Bottom tab bar above system gesture bar | | ✓ | | Safe area |

---

## 4. ADD FRIEND

| # | Test | Web | Android | iOS | Notes |
|---|------|-----|---------|-----|--------|
| 4.1 | Add friend by name + email/phone → success, back to Friends | | | | |
| 4.2 | Validation: empty name or invalid email → error | | | | |

---

## 5. FRIEND DETAIL

| # | Test | Web | Android | iOS | Notes |
|---|------|-----|---------|-----|--------|
| 5.1 | Balance and "You owe" / "Owes you" / "Settled up" correct | | | | |
| 5.2 | Expense list shows; tap expense → expense detail | | | | |
| 5.3 | Settle up button → opens Settle up screen | | | | |
| 5.4 | Add expense button → opens Add expense | | | | |
| 5.5 | Delete/remove friend → confirm → friend removed, back | | | | |

---

## 6. GROUPS TAB

| # | Test | Web | Android | iOS | Notes |
|---|------|-----|---------|-----|--------|
| 6.1 | Groups list loads (empty or with groups) | | | | |
| 6.2 | Tap group → group detail (members, expenses, balances) | | | | |
| 6.3 | Personal expenses link → personal expenses screen | | | | |
| 6.4 | Search icon → Search | | | | |
| 6.5 | Create group → Create Group modal | | | | |
| 6.6 | Add expense FAB → Add expense | | | | |

---

## 7. CREATE GROUP

| # | Test | Web | Android | iOS | Notes |
|---|------|-----|---------|-----|--------|
| 7.1 | Enter name, select type (Home/Trip/Couple/Other) | | | | |
| 7.2 | Add members: select friends and/or add by name+email/phone | | | | |
| 7.3 | Create → group created, navigate to group or back | | | | |
| 7.4 | Default split settings (if set) applied when adding expense to group | | | | |

---

## 8. GROUP DETAIL

| # | Test | Web | Android | iOS | Notes |
|---|------|-----|---------|-----|--------|
| 8.1 | Members and balances shown | | | | |
| 8.2 | Expense list; tap expense → expense detail | | | | |
| 8.3 | Add expense → Add expense (with group pre-selected) | | | | |
| 8.4 | Settle up → Settle up screen | | | | |
| 8.5 | Add member (if UI exists) → add member flow | | | | |

---

## 9. ADD / EDIT EXPENSE

| # | Test | Web | Android | iOS | Notes |
|---|------|-----|---------|-----|--------|
| 9.1 | Open Add expense → form (description, amount, with who, date, etc.) | | | | |
| 9.2 | "With you and": select **group** → group chip, members for split | | | | |
| 9.3 | "With you and": select **individual friend** → friend chip, split with you + friend | | | | |
| 9.4 | "With you and": tap field again after selection → dropdown reopens | | | | |
| 9.5 | Tap outside / focus description or amount → contact dropdown closes | | | | |
| 9.6 | Enter description, amount; choose payer; Save → expense created, back | | | | |
| 9.7 | Split: Equally → equal split; Exact → enter amounts; Percentage; Shares; Adjustment | | | | |
| 9.8 | Category → category modal; select category → applied | | | | |
| 9.9 | Currency → currency modal; change currency → symbol updates | | | | |
| 9.10 | Date → date picker; select date → label updates | | | | |
| 9.11 | One-time / Recurring → Recurring modal opens; set monthly/weekly etc. | | | | |
| 9.12 | Notes → notes modal; save notes | | | | |
| 9.13 | Receipt: Camera or library → image attached; "Use image only" → prefill with image | | | | |
| 9.14 | **Receipt OCR:** Tap "Tap to extract items" (with backend deployed + endpoint set) → items/total filled | | | | Needs Cloud Function |
| 9.15 | Edit expense (from detail → Edit) → form prefilled; Save → expense updated, no "Failed to update" | | | | |
| 9.16 | Validation: empty description or invalid amount → error alert | | | | |
| 9.17 | Multi-currency: expense in different currency than group → FX conversion (if implemented) | | | | |

---

## 10. EXPENSE DETAIL

| # | Test | Web | Android | iOS | Notes |
|---|------|-----|---------|-----|--------|
| 10.1 | Opens with correct description, amount, payer, split, date | | | | |
| 10.2 | Edit button → Add expense in edit mode; save → updated | | | | |
| 10.3 | Delete (if available) → confirm → expense deleted | | | | |

---

## 11. PERSONAL EXPENSES

| # | Test | Web | Android | iOS | Notes |
|---|------|-----|---------|-----|--------|
| 11.1 | List of personal (non-group) expenses | | | | |
| 11.2 | Add expense → Add expense (no group) | | | | |
| 11.3 | Tap expense → expense detail | | | | |

---

## 12. RECEIPT SCANNING

| # | Test | Web | Android | iOS | Notes |
|---|------|-----|---------|-----|--------|
| 12.1 | Add expense → Receipt → Scan receipt (or "Scan receipt (extract items)") | | | | |
| 12.2 | Take photo or choose from library → image preview | | | | |
| 12.3 | "Use image only" → attaches image to expense, back to add form | | | | |
| 12.4 | **With OCR backend:** "Tap to extract items" → loading → merchant/items/total filled | | | | |
| 12.5 | **Without OCR / OCR fails:** Clear error message; "Use image only" still works | | | | |
| 12.6 | Web: message that scanning is in app; choose image still works | ✓ | | | |

---

## 13. SEARCH

| # | Test | Web | Android | iOS | Notes |
|---|------|-----|---------|-----|--------|
| 13.1 | Search screen opens; type query → results (expenses) | | | | |
| 13.2 | Tap result → expense detail | | | | |
| 13.3 | Empty query or no results → appropriate message | | | | |

---

## 14. ACTIVITY TAB

| # | Test | Web | Android | iOS | Notes |
|---|------|-----|---------|-----|--------|
| 14.1 | Activity list loads (expenses added, updated, settlements) | | | | |
| 14.2 | Tap expense activity → expense detail | | | | |
| 14.3 | Tap group activity → group detail | | | | |
| 14.4 | Search icon → Search; Add expense FAB → Add expense | | | | |

---

## 15. SETTLE UP

| # | Test | Web | Android | iOS | Notes |
|---|------|-----|---------|-----|--------|
| 15.1 | Select friend, enter amount, optional notes → Settle → success alert, back | | | | |
| 15.2 | Balance updates after settlement (friend detail / Friends list) | | | | |
| 15.3 | Invalid amount → error | | | | |

---

## 16. CHARTS & REPORTS

| # | Test | Web | Android | iOS | Notes |
|---|------|-----|---------|-----|--------|
| 16.1 | Charts screen opens; time range (All, 7d, 30d, 3m, 1y) | | | | |
| 16.2 | Group filter (All groups / specific group) | | | | |
| 16.3 | Category spending / trends displayed | | | | |
| 16.4 | No data → empty state | | | | |

---

## 17. ACCOUNT TAB

| # | Test | Web | Android | iOS | Notes |
|---|------|-----|---------|-----|--------|
| 17.1 | Profile (name, email, avatar if any) | | | | |
| 17.2 | Edit profile → change name → save | | | | |
| 17.3 | Default currency → change → saved | | | | |
| 17.4 | Theme (System / Light / Dark) → applied | | | | |
| 17.5 | Personal expenses, Charts, Search links → correct screens | | | | |
| 17.6 | **Web:** Keyboard shortcuts section visible; shortcuts work (Ctrl+K, Ctrl+N, Ctrl+1–4, Esc) | ✓ | | | |
| 17.7 | Change password (if has password) → flow works | | | | |
| 17.8 | Delete account → confirm → account deleted, logout | | | | |
| 17.9 | Log out → confirm → login screen | | | | |

---

## 18. ADMIN (admin users only)

| # | Test | Web | Android | iOS | Notes |
|---|------|-----|---------|-----|--------|
| 18.1 | Admin entry (e.g. from Account or direct route) → admin layout | | | | |
| 18.2 | Users list / management | | | | |
| 18.3 | Groups list / management | | | | |
| 18.4 | Expenses list | | | | |
| 18.5 | System: Activate maintenance → success; regular user sees maintenance screen | | | | |
| 18.6 | System: End maintenance → success; regular user sees app again | | | | |
| 18.7 | Activity log / Analytics (if present) | | | | |
| 18.8 | Logout from admin → back to app or login | | | | |

---

## 19. WEB-SPECIFIC

| # | Test | Notes |
|---|------|--------|
| 19.1 | Keyboard: Ctrl+K → Search | |
| 19.2 | Keyboard: Ctrl+N → New expense | |
| 19.3 | Keyboard: Ctrl+1 – Ctrl+4 → Switch tab (Friends, Groups, Activity, Account) | |
| 19.4 | Keyboard: Esc → Back / close modal | |
| 19.5 | Login: Enter in password field submits form | |
| 19.6 | Responsive: wide layout (e.g. tablet width) – centered content, readable | |

---

## 20. ANDROID-SPECIFIC

| # | Test | Notes |
|---|------|--------|
| 20.1 | Safe area: status bar doesn’t overlap header; nav bar doesn’t overlap tab bar | |
| 20.2 | Back hardware key: goes back as expected | |
| 20.3 | Keyboard: decimal pad for amount; no autofill spam on "With you and" field | |
| 20.4 | Receipt: camera permission requested; photo capture works | |
| 20.5 | Haptics (if enabled): light/medium on taps where implemented | |

---

## 21. IOS-SPECIFIC

| # | Test | Notes |
|---|------|--------|
| 21.1 | Safe area: notch / home indicator respected | |
| 21.2 | Sign in with Apple: button visible and works | |
| 21.3 | Keyboard: return key "Go" on login; "next" / "done" on add expense | |
| 21.4 | Receipt: camera/photo library permission; capture/pick works | |
| 21.5 | Haptics on supported device | |

---

## 22. OFFLINE / ERROR HANDLING

| # | Test | Web | Android | iOS | Notes |
|---|------|-----|---------|-----|--------|
| 22.1 | No network: graceful error (e.g. "Failed to load") or offline queue | | | | |
| 22.2 | Invalid/expired auth → redirect to login | | | | |
| 22.3 | Firestore permission denied → clear error, no crash | | | | |

---

## Quick summary

- **Total test cases:** 100+ (expand with edge cases as needed).
- **Platforms:** Web, Android, iOS (mark each column).
- **Critical paths:** Login → Friends → Add expense (group + friend) → Edit expense → Settle up → Charts → Account → Logout.
- **Pro-style features covered:** Unlimited expenses, receipt scanning (with/without OCR), itemization (via OCR), currency, charts, expense search, default split (groups), maintenance, admin.

Run through this checklist on **Web** (browser), **Android** (device/emulator), and **iOS** (simulator/device) and mark Pass/Fail so you can see what’s working and what’s not.
