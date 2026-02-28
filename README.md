# 💸 SplitX — Smart Expense Splitting

> 🚀 A **production-grade** Splitwise clone built with **Expo (React Native)** — runs on iOS, Android, iPad, Web, Mac & Desktop from a single codebase.

---

## ✨ What's New in v3.0.0

🧾 **AI-Powered Receipt Scanning** — Snap a photo, get structured data in ~2 seconds  
🤖 Powered by **Google Gemini 2.5 Flash** Vision API  
📱 Works on **iOS + Android + Web** — no Cloud Functions needed  
⚡ Single API call: image → merchant, items, total, currency  

---

## 🎯 Features

### 💰 Core Expense Management
- ➕ **Add Expenses** — Quick entry with description, amount, category
- ✏️ **Edit & Delete** — Full CRUD with optimistic updates
- 🔁 **Recurring Expenses** — Daily, weekly, monthly, yearly
- 🏷️ **30+ Categories** — Food, transport, entertainment, bills, and more
- 🔍 **Full-Text Search** — Find any expense instantly

### 🤝 Splitting & Groups
- ⚖️ **Smart Splitting** — Equal, exact, percentage, shares, or adjustment-based
- 👥 **Groups** — Trips, roommates, couples, events
- 👫 **Friends** — Track individual balances
- 🔄 **Debt Simplification** — Minimizes number of payments needed
- 💵 **Settle Up** — Record settlements with one tap

### 🧾 AI Receipt Scanning ✨ NEW
- 📸 **Snap & Extract** — Take a photo or choose from library
- 🤖 **Gemini Vision AI** — Extracts merchant, line items, total, currency
- ⚡ **~2 Second Response** — Matches Splitwise.com speed
- 🌍 **Multi-Currency Detection** — Auto-detects USD, EUR, GBP, INR, etc.
- ✏️ **Editable Results** — Review and adjust before saving
- 🖥️ **Works on Web** — Not just mobile anymore

### 💱 Multi-Currency
- 🌐 **50+ Currencies** — Full international support
- 📊 **Live Exchange Rates** — Auto-fetched FX rates
- 🏠 **Group Default Currency** — Set per-group preferences
- 🔄 **Auto-Convert** — See balances in your preferred currency

### 📊 Analytics & Insights
- 📈 **Charts & Graphs** — Category breakdown, monthly trends
- 📉 **Spending Patterns** — Track where your money goes
- 📅 **Date Filters** — Analyze by week, month, quarter, year
- 💎 **Statistics** — Averages, totals, top categories

### 🔐 Authentication
- 📧 **Email & Password** — Traditional signup with email verification
- 🍎 **Apple Sign-In** — One-tap auth on iOS
- 🔑 **Google Sign-In** — OAuth integration
- 🔒 **Password Reset** — Secure email-based recovery
- ✉️ **Email Verification** — Required before access

### 🛡️ Admin Panel
- 👤 **User Management** — View, edit, disable users
- 💳 **Expense Oversight** — Monitor all expenses across the platform
- 👥 **Group Management** — Oversee all groups
- 📊 **Analytics Dashboard** — Platform-wide insights
- 📋 **Activity Log** — Full audit trail
- ⚙️ **System Settings** — Platform configuration
- 🔧 **Maintenance Mode** — Toggle app access

### 📱 Platform & UX
- 🌙 **Dark Mode** — Automatic light/dark theme
- 📱 **Responsive Design** — Phone, tablet, desktop optimized
- 📡 **Offline Support** — Queue operations when offline
- 🔔 **Network Awareness** — Banner when connectivity drops
- 🫧 **Haptic Feedback** — Native feel on iOS & Android
- ⌨️ **Keyboard Handling** — Smart keyboard avoidance

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| 📱 **Framework** | Expo SDK 54 (React Native) |
| 🧭 **Navigation** | Expo Router (file-based) |
| 🔤 **Language** | TypeScript |
| 🔥 **Backend** | Firebase (Firestore + Auth + Storage) |
| 🗄️ **Local DB** | SQLite (expo-sqlite) for offline |
| 🧠 **State** | Zustand |
| 🤖 **AI** | Google Gemini 2.5 Flash Vision API |
| 🎨 **Icons** | Material Icons |
| 💱 **FX Rates** | Live exchange rate API |

---

## 🚀 Getting Started

### Prerequisites

- 📦 Node.js 18+
- 📱 Expo CLI (`npx expo`)
- 🔥 Firebase project ([console.firebase.google.com](https://console.firebase.google.com))
- 🤖 Gemini API key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/splitwise.git
cd splitwise

# Install dependencies
npm install
```

### Configuration

#### 🔥 Firebase Setup
Configure your Firebase project in `services/firebase.ts`:
```typescript
const firebaseConfig = {
  apiKey: 'YOUR_FIREBASE_API_KEY',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project.firebasestorage.app',
  // ...
};
```

#### 🧾 Receipt Scanning Setup
Add your Gemini API key in `services/scanConfig.ts`:
```typescript
export const ReceiptScanConfig = {
  geminiApiKey: 'YOUR_GEMINI_API_KEY',  // Free at aistudio.google.com
  model: 'gemini-2.5-flash',
  timeoutMs: 15_000,
};
```

### Run the App

```bash
# Start dev server
npx expo start

# Platform-specific
npx expo start --web        # 🌐 Web browser
npx expo start --ios        # 🍎 iOS Simulator
npx expo start --android    # 🤖 Android Emulator
```

---

## 📁 Project Structure

```
splitwise/
├── 📱 app/                     # Expo Router pages
│   ├── (auth)/                 # 🔐 Login, Signup, Verify, Reset
│   ├── (tabs)/                 # 🏠 Home, Groups, Activity, Account
│   ├── admin/                  # 🛡️ Admin panel (9 screens)
│   ├── expense/                # 💰 Add, Edit, Receipt Scan
│   ├── group/                  # 👥 Create, Detail
│   ├── friend/                 # 👫 Friend detail
│   ├── charts.tsx              # 📊 Analytics & charts
│   ├── search.tsx              # 🔍 Full-text search
│   └── settle-up.tsx           # 💵 Settlement flow
├── 🧩 components/              # Shared UI components
│   ├── Avatar.tsx              # 👤 User avatars
│   ├── BalanceBar.tsx          # 📊 Visual balance indicator
│   ├── Button.tsx              # 🔘 Reusable button
│   ├── EmptyState.tsx          # 📭 Empty state illustrations
│   ├── ExpenseCard.tsx         # 💳 Expense list item
│   ├── GroupCard.tsx           # 👥 Group list item
│   ├── Input.tsx               # ⌨️ Form input
│   ├── MaintenanceScreen.tsx   # 🔧 Maintenance mode
│   ├── NetworkBanner.tsx       # 📡 Offline indicator
│   └── Toast.tsx               # 🫧 Toast notifications
├── ⚙️ services/                # Business logic
│   ├── firebase.ts             # 🔥 Firebase init
│   ├── database.ts             # 🗄️ Firestore CRUD
│   ├── receiptScan.ts          # 🧾 Gemini Vision scanning
│   ├── scanConfig.ts           # 🔑 API key config
│   ├── fx.ts                   # 💱 Exchange rates
│   ├── admin.ts                # 🛡️ Admin operations
│   └── offlineQueue.ts         # 📡 Offline operation queue
├── 🏪 stores/                  # Zustand state
│   ├── useAuthStore.ts         # 🔐 Auth state
│   ├── useExpenseStore.ts      # 💰 Expense state
│   ├── useGroupStore.ts        # 👥 Group state
│   ├── useFriendStore.ts       # 👫 Friend state
│   └── useToastStore.ts        # 🫧 Toast state
├── 📝 types/                   # TypeScript definitions
├── 🎨 constants/               # Colors, categories, currencies
└── 🔧 utils/                   # Hooks & utilities
```

---

## 🎨 UI / UX Design System

### 🎨 Design Principles

| Principle | Implementation |
|-----------|---------------|
| 🧹 **Clean & Minimal** | Generous whitespace, clear hierarchy, no clutter |
| 🫧 **Native Feel** | Haptic feedback, native transitions, platform conventions |
| 🌊 **Fluid Interactions** | Smooth animations, gesture-based navigation |
| ♿ **Accessible** | High contrast, proper touch targets (44pt min), screen reader support |
| 📱 **Responsive** | Adaptive layouts for phone → tablet → desktop |

### 🎭 Theme System

The app uses a **dynamic dual-theme system** (light + dark) with automatic OS preference detection:

| Token | Light | Dark |
|-------|-------|------|
| 🎨 Background | `#FFFFFF` | `#1A1A2E` |
| 📝 Text | `#1A1A2E` | `#E8E8F0` |
| 🟢 Primary | `#1CC29F` (teal-green) | `#1CC29F` |
| 🔴 Error | `#E74C3C` | `#FF6B6B` |
| 📦 Card | `#FFFFFF` | `#2A2A40` |
| 🔲 Border | `#E8E8F0` | `#3A3A50` |

### 📐 Layout Patterns

#### 📱 Phone (< 768px)
- Full-width cards
- Bottom tab navigation
- Modal sheets from bottom
- Single-column layout

#### 📱 Tablet / Desktop (≥ 768px)  
- Centered content (max 500px)
- Larger touch targets
- Side-by-side layouts where appropriate
- Desktop-optimized modals

### 🧩 Component Library

| Component | Purpose | Features |
|-----------|---------|----------|
| `Avatar` | User identity | Initials, color-coded, size variants |
| `BalanceBar` | Balance visualization | Gradient bar, positive/negative |
| `Button` | Actions | Primary, secondary, destructive variants |
| `EmptyState` | No-content state | Icon + title + subtitle + action |
| `ExpenseCard` | Expense display | Category icon, amount, split info |
| `GroupCard` | Group display | Member count, balance summary |
| `Input` | Form fields | Validation, error states, icons |
| `NetworkBanner` | Connectivity | Auto-show/hide on network change |
| `Toast` | Notifications | Success, error, info variants |

### 🧾 Receipt Scan UX Flow

```
┌─────────────────┐
│ 📸 Take Photo    │ ──→ Auto-triggers AI scan
│ 🖼️ From Library  │     immediately after pick
└────────┬────────┘
         ▼
┌─────────────────┐
│ ⏳ Scanning...   │ ~1-2 seconds
│ (overlay on img) │
└────────┬────────┘
         ▼
┌─────────────────┐
│ ✅ Results Ready │
│ • Merchant name  │ ← editable
│ • Line items     │ ← add/remove/edit
│ • Total amount   │ ← editable
│ • Currency       │ ← auto-detected
└────────┬────────┘
         ▼
┌─────────────────┐
│ 💾 Use for       │ Pre-fills the Add
│    Expense       │ Expense form
└─────────────────┘
```

### 💡 Interaction Patterns

| Interaction | Behavior |
|------------|----------|
| 🫧 **Haptic Feedback** | Success (checkmark), error (buzz), selection (tick) |
| 🔙 **Unsaved Changes** | Confirmation dialog before discarding |
| 🔄 **Pull to Refresh** | Refresh data on main lists |
| 🔍 **Live Search** | Debounced, filters as you type |
| ⌨️ **Keyboard** | Auto-focus, return key chains, dismiss on tap |
| 🚫 **Duplicate Detection** | Warns if same expense exists |
| 📡 **Offline** | Queues operations, syncs on reconnect |

---

## 📋 Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| 🍎 iOS (iPhone) | ✅ Fully supported | Apple Sign-In, haptics, camera |
| 🤖 Android | ✅ Fully supported | Google Sign-In, haptics, camera |
| 📱 iPad | ✅ Fully supported | Responsive tablet layout |
| 🌐 Web | ✅ Fully supported | Receipt scan works on web too |
| 🖥️ macOS | ✅ Via Web | Full functionality |
| 💻 Desktop | ✅ Via Web | Responsive desktop layout |

---

## 🔖 Version History

| Version | Date | Highlights |
|---------|------|-----------|
| **v3.0.0** | Feb 2026 | 🧾 AI Receipt Scanning (Gemini Vision), 📡 Network awareness, 🫧 Toast system |
| **v2.0.0** | Feb 2026 | 🔥 Firebase migration, 🍎 Apple Sign-In, 🔁 Recurring expenses, 💱 Multi-currency, 📡 Offline support, 🛡️ Admin panel |
| **v1.0.0** | — | 📱 Initial release with SQLite backend |

---

## 📄 License

MIT

---

<p align="center">
  Built with ❤️ using Expo + Firebase + Gemini AI
</p>
