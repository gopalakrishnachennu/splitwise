# Admin panel – owner control & features

This document describes **everything the app owner (and any admin) can see and do** from the admin panel. As the corporate owner you have end-to-end visibility and control.

---

## Access

- **Who:** Only users with `role: 'admin'` in Firestore (`users/<userId>.role`) can open the admin panel.
- **How to get in:** Sign in with an admin account, then go to **Admin** (e.g. from account or a direct link to `/admin`).
- **How to make someone admin:** In the admin panel → **Users** → select a user → **Make admin**. (You can also set `users/<uid>.role` to `"admin"` in Firestore.)

---

## 1. Dashboard

- **Live metrics:** Total users, groups, expenses, settlements, money tracked, activities, signups (24h), active today.
- **Charts:** Top expense categories (with totals and counts), top spenders (users by total paid).
- **Owner summary:** Short “You have full control” card that points to Settings for the full list.

---

## 2. Users

- **List:** All users with search (name, email, phone).
- **Per user:** Name, email, phone, currency, joined date, group count, expense count, total spent, **role** (Admin / User).
- **Actions:**
  - **Make admin** / **Remove admin** – set or remove admin access (logged in Activity log).
  - **Delete user** – permanently remove user and their friends data (logged in Activity log).

---

## 3. Groups

- **List:** All groups with search by name.
- **Per group:** Name, type, member count, expense count, total amount, currency, created/updated.
- **Action:** **Delete group** (logged in Activity log). Expenses linked to the group are not deleted.

---

## 4. Expenses

- **List:** Up to 100 expenses, sorted by date. Search by description, filter by category.
- **Per expense:** Description, amount, currency, category, split type, date, group name, created by.
- **Flagging:** Expenses over a threshold (e.g. $10k) are marked for review.
- **Action:** **Delete expense** (logged in Activity log).

---

## 5. Analytics

- **Top categories** – by total amount and count.
- **Daily signups** – last 30 days.
- **Monthly expenses** – last 12 months (total + count).
- **Top users** – by total spent.
- **Top groups** – by total amount and member count.
- **Currency distribution** – expense count per currency.
- **Split type distribution** – equal / exact / percentage / shares.

---

## 6. Activity log

- **What:** Chronological list of app and admin actions.
- **App actions:** Expense added/updated/deleted, group created, member added/removed, settlement.
- **Admin actions:** User deleted, group deleted, expense deleted, role changed (who did it and what target).
- **Filter:** All, Expenses, Groups, Settlements, **Admin actions**.

---

## 7. System

- **Database:** Row counts per collection (users, friends, groups, expenses, activities, settlements), total records, estimated size.
- **Maintenance mode:**
  - **Activate** – block all non-admin users with a configurable message and optional duration (15 min – indefinite).
  - **Update message** while active.
  - **End maintenance** – restore access for everyone.
- **System info:** App version, DB engine, framework (Expo), data mode.

---

## 8. Settings

- **App info:** App name, version, Firebase project ID, where icon/splash live (app.json, assets).
- **Link:** “How to change app icon” (Expo docs).
- **What you control:** Checklist of all areas (users, groups, expenses, analytics, activity log, system, maintenance, promote admins, branding).

---

## Branding (app icon, name, splash)

- **Controlled by:** `app.json` and files in `assets/` (e.g. `icon.png`, `splash-icon.png`, `adaptive-icon.png`, `favicon.png`).
- **To change:** Edit `app.json` (name, icon path, splash, etc.) and replace the image files; then rebuild the app (e.g. `npx expo prebuild` and build for iOS/Android).
- The admin panel does **not** change the icon at runtime; it only shows where to configure it and links to Expo docs.

---

## Audit trail

- **Admin actions** are written to the `activities` collection with types:
  - `admin_user_deleted`
  - `admin_group_deleted`
  - `admin_expense_deleted`
  - `admin_role_changed`
- Each record includes who performed the action (`createdBy`, `createdByName`) and a short description. You can review them in **Activity log** with the “Admin actions” filter.

---

## Summary

| Area        | Visibility / control |
|------------|-----------------------|
| **Users**  | List, search, delete, make/remove admin |
| **Groups** | List, search, delete |
| **Expenses** | List, search, filter, delete |
| **Analytics** | Categories, signups, monthly spend, top users/groups, currencies, split types |
| **Activity** | All app + admin actions with filter |
| **System** | DB health, maintenance (block all users) |
| **Settings** | App name, version, Firebase project, branding guide |
| **Branding** | Via app.json + assets (rebuild required) |

As the owner you have full control over who is admin, what data exists, and when the app is in maintenance; and full visibility into usage and every destructive or role change action.
