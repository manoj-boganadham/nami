# Nami — Technical Specifications (v1)

## 1. Project Overview
Nami is a personal finance tracking system that captures debit/spend SMS messages (primarily via iPhone Shortcuts), processes them into structured transactions, and provides spending analytics through a nautical-themed web dashboard. Unlike earlier versions, **v1 removes all AI-based auto-categorization** in favor of manual precision.

## 2. Technical Stack
- **Backend:** Python 3.x, FastAPI
- **Frontend:** React (TypeScript) + Tailwind CSS (as per `ui-requirements/v1.md`)
- **Database:** SQLite
- **Extraction:** Regex-based (not AI)
- **Deployment:** Docker
- **Automation:** System `cron` for transaction generation from raw logs.

## 3. System Architecture

### 3.1 Ingest Pipeline (Real-time)
1. **Source:** iPhone Shortcut sends SMS text to `POST /api/messages`.
2. **Auth:** Request must include a static `X-API-Key`.
3. **Persistence:** Message is saved to `raw_messages` table with a UTC timestamp.

### 3.2 Processing Pipeline (Cron-driven)
1. **Trigger:** `generate_transactions.py` runs on a cron schedule (default: 11 PM daily).
2. **Regex Extraction:** Extracts INR amounts (e.g., `₹500`, `Rs 1,200`).
3. **Transaction Creation:** For every successful extraction, a record is created in the `transactions` table (initially `category = null`).
4. **State Management:** `raw_messages` are marked as `processed=true`.

### 3.3 Dashboard & Management
1. **Frontend:** React app displays stats and transaction lists.
2. **Manual Categorization:** User assigns categories (Food, Transport, etc.) via `PATCH /api/transactions/:id`.
3. **Analytics:** Backend aggregates data for the dashboard via `/api/stats`.

## 4. Database Schema (SQLite)

### Table: `raw_messages`
| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `message` | TEXT | Raw SMS body |
| `received_at` | DATETIME | DEFAULT UTC NOW |
| `processed` | BOOLEAN | DEFAULT FALSE |
| `parse_failed` | BOOLEAN | DEFAULT FALSE |

### Table: `transactions`
| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `raw_message_id` | INTEGER | FOREIGN KEY (`raw_messages.id`) |
| `amount` | REAL | Extracted amount |
| `category` | TEXT | NULLABLE (User assigned) |
| `timestamp` | DATETIME | From `raw_messages.received_at` |
| `created_at` | DATETIME | DEFAULT UTC NOW |

## 5. UI/UX Specifications
- **Theme:** Nautical "Treasure Ledger" (Cinzel/DM Sans fonts).
- **Categorization:** Inline category picker for uncategorized transactions.
- **Visual Flags:** Highlight spends >₹2,000 with a ⚑ red flag.
- **Nami-Branding:** "Today's Haul", "Log Entries", "The Chart Room".
- **Dynamic Feedback:** Status badges based on spending thresholds and uncategorized counts.

## 6. Configuration (.env)
```bash
API_KEY=your_static_secret
LARGE_SPEND_THRESHOLD=2000
DATABASE_PATH=./finance.db
CRON_SCHEDULE="0 23 * * *"
PORT=8000
```

## 7. Development Roadmap (v1)
1. **Phase 1: Ingest & Storage** - FastAPI endpoints for messages and SQLite setup.
2. **Phase 2: Regex Engine** - Build and test the `generate_transactions.py` regex logic.
3. **Phase 3: Dashboard API** - Stats aggregation and transaction management endpoints.
4. **Phase 4: React Dashboard** - Implement the UI with theme toggle and inline categorization.
5. **Phase 5: Cron & Docker** - Finalize the containerized environment and task scheduling.
