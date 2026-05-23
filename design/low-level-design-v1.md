# Nami — Low-Level Design Document (v1)

This document outlines the database tables, modules, regex mechanisms, and component-level designs of the **Nami Personal Finance Assistant (v1)**.

---

## 1. Database Schema & Models

We use SQLite for local persistence, utilizing SQLAlchemy for object-relational mapping.

```
raw_messages                        transactions
------------                        ------------
id (PK, Auto-inc)    <----------    id (PK, Auto-inc)
message (TEXT)              |---    raw_message_id (FK -> raw_messages.id)
received_at (DATETIME)              amount (REAL)
processed (BOOLEAN)                 category (TEXT, Nullable)
parse_failed (BOOLEAN)              description (TEXT, Nullable)
                                    timestamp (DATETIME)
                                    created_at (DATETIME)
```

### 1.1 `raw_messages` Table
- `id`: `INTEGER`, PRIMARY KEY, AUTOINCREMENT.
- `message`: `TEXT`, NOT NULL (stores the raw SMS text).
- `received_at`: `DATETIME`, DEFAULT `datetime.utcnow` (timestamp when the API successfully parsed it).
- `processed`: `BOOLEAN`, DEFAULT `FALSE`.
- `parse_failed`: `BOOLEAN`, DEFAULT `FALSE`.

### 1.2 `transactions` Table
- `id`: `INTEGER`, PRIMARY KEY, AUTOINCREMENT.
- `raw_message_id`: `INTEGER`, FOREIGN KEY referencing `raw_messages.id`. Cascades deletions.
- `amount`: `REAL`, NOT NULL (parsed INR value).
- `category`: `TEXT`, NULLABLE. Restrictable values: `Food`, `Transport`, `Shopping`, `Health`, `Utilities`, `Entertainment`, `Other`.
- `description`: `TEXT`, NULLABLE. Stores raw message by default, but is user-editable.
- `timestamp`: `DATETIME`, NOT NULL (copied from `raw_messages.received_at`).
- `created_at`: `DATETIME`, DEFAULT `datetime.utcnow`.

---

## 2. Backend Modules & Classes

The codebase is organized as follows:

- `db/`
  - `database.py`: Instantiates the SQLite DB engine and exports `SessionLocal` and dependency `get_db()`.
  - `models.py`: Contains the SQLAlchemy declarative models `RawMessage` and `Transaction`.
  - `init_db.py`: Executes `Base.metadata.create_all(bind=engine)` to initialize the schema.
- `routes/`
  - `messages.py`: Implements the ingestion router.
  - `transactions.py`: Implements the transaction querying and patching router.
  - `stats.py`: Implements aggregations and trend calculation.
- `services/`
  - `transaction_generator.py`: Holds the business logic for matching regex and parsing unprocessed logs.
- `generate_transactions.py`: Shell entry point called by the operating system cron engine.

---

## 3. Ingestion & Security Middleware

To ensure only the user's phone or trusted clients can hit the ingestion route:
- A custom dependency `verify_api_key` reads the `X-API-Key` header.
- If it is missing or doesn't match the `.env` value `API_KEY`, it raises an `HTTPException(status_code=401, detail="Unauthorized")`.

---

## 4. Transaction Generator & Regex Engine

The extractor is designed to handle multiple amounts (e.g. including account balances) by prioritizing amount phrases tied directly to spend/debit action keywords.

### 4.1 Match Logic Flowchart

```
[Raw Message Text]
       │
       ▼
   [Convert to Lowercase]
       │
       ▼
 ┌───────────────────────────────────────────────┐
 │ Check Priority 1: Keyword-Associated Spends   │
 │ (e.g. "debited for Rs 500", "spent ₹1200")    │
 └──────────────────────┬────────────────────────┘
                        │
                  Match Found?
                 /            \
               YES             NO
               /                 \
              ▼                   ▼
    [Extract amount value]   ┌─────────────────────────────────────────┐
    [Remove commas]          │ Check Priority 2: General Currencies    │
    [Return float]           │ (e.g. "₹500", "Rs 1,200", "450 rupees") │
                             └────────────────────┬────────────────────┘
                                                  │
                                            Match Found?
                                           /            \
                                         YES             NO
                                         /                 \
                                        ▼                   ▼
                              [Extract amount value]  [Return None]
                              [Remove commas]         [Mark parse_failed=True]
                              [Return float]
```

### 4.2 Patterns Detail
1. **Keyword pattern 1:** `(?:debited|spent|paid|transferred|sent|withdrawn|charged)\s+(?:for|by|to|of)?\s*(?:rs\.?|₹|inr)?\s*([0-9,]+(?:\.[0-9]+)?)`
2. **Keyword pattern 2:** `(?:rs\.?|₹|inr)?\s*([0-9,]+(?:\.[0-9]+)?)\s+(?:debited|spent|paid|transferred|sent|withdrawn|charged)`
3. **General pattern 1:** `(?:₹|rs\.?|inr)\s*([0-9,]+(?:\.[0-9]+)?)`
4. **General pattern 2:** `([0-9,]+(?:\.[0-9]+)?)\s*(?:rupees|rs\.?|inr)`

---

## 5. React Dashboard (Frontend Architecture)

The frontend is a single-page React app with client-side state management.

### 5.1 Component Structure
- `App.tsx`: Base router and layout wrapper.
- `components/Header.tsx`: Brand title (**NAMI** in Cinzel font), dynamic SVG windwheel icon, date range picker chips (Today / 7 days / 30 days / Custom), and Theme Toggle button.
- `components/StatsRow.tsx`: Grid containing four stylized cards ("Today's Haul", "Weekly Total", "Flagged Spends", "Log Entries") with responsive colors.
- `components/CategoryPanel.tsx`: Plunder by Category cards featuring visual progress meters representing spend shares.
- `components/TransactionList.tsx`: Tabular overview of charges grouped by day. Displays inline category picker widgets for `null` entries.
- `components/TrendChart.tsx`: Renders a daily spend chart over the queried window using Recharts.
- `components/NamiNavigator.tsx`: Side panel displaying the Nami vector artwork and dynamic budget warning alerts.

### 5.2 Global & Persistent State
- `ThemeState`: Switches the root application markup to `data-theme="dark"`. Persisted in `localStorage` under `nami-theme`.
- `DateRangeState`: Controls current filter limits (`from` and `to` strings). Default initialized to the current date.
- `StatsCache`: Syncs with backend `/api/stats` and `/api/transactions` updates. Reloads data when categories are modified.
