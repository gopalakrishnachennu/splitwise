# Splitwise Clone

A full-featured expense splitting app built with **Expo (React Native)** - runs on iOS, Android, iPad, Web, Mac, and Desktop from a single codebase.

## Features

- **Expense Tracking** - Add, edit, delete expenses with categories
- **Smart Splitting** - Equal, exact amount, percentage, or shares-based splits
- **Groups** - Create groups for trips, roommates, couples, etc.
- **Friends** - Manage friends and track individual balances
- **Debt Simplification** - Minimizes the number of payments needed
- **Settle Up** - Record payments between friends
- **Activity Feed** - Timeline of all expense activity
- **Charts & Analytics** - Category breakdown, monthly trends, statistics
- **Search** - Full-text search across all expenses
- **Categories** - 30+ expense categories with icons
- **Multi-Currency** - Support for 50+ currencies
- **Offline First** - SQLite database for full offline support
- **Dark Mode** - Automatic light/dark theme
- **Responsive** - Optimized for phone, tablet, and desktop screens
- **Recurring Expenses** - Set up repeating expenses

## Tech Stack

- **Expo SDK 54** - Cross-platform framework
- **Expo Router** - File-based navigation
- **TypeScript** - Type safety
- **SQLite** (expo-sqlite) - Local offline database
- **Zustand** - Lightweight state management
- **Material Icons** - Consistent iconography

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npx expo`)

### Installation

```bash
npm install
```

### Run the App

```bash
# Start the dev server
npx expo start

# Run on specific platforms
npx expo start --web        # Web browser
npx expo start --ios        # iOS Simulator
npx expo start --android    # Android Emulator
```

### Platform Support

| Platform | Status |
|----------|--------|
| iOS (iPhone) | Supported |
| Android | Supported |
| iPad | Supported |
| Web | Supported |
| macOS | Via Web |
| Desktop | Via Web |

## Project Structure

```
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main tab navigation
│   ├── group/             # Group detail & creation
│   ├── expense/           # Expense detail & creation
│   └── friend/            # Friend detail
├── components/            # Shared UI components
├── services/              # Database & business logic
├── stores/                # Zustand state management
├── types/                 # TypeScript type definitions
├── constants/             # Colors, categories, currencies
└── utils/                 # Hooks & responsive utilities
```

## License

MIT
