# Nami — Development Tasks (v1)

## Phase 1: Ingest & Storage (Backend Core)
- [ ] Initialize project structure (folders for routes, services, db)
- [ ] Setup `.env` template and configuration loader
- [ ] Configure SQLite database connection using SQLAlchemy or raw `sqlite3`
- [ ] Create database initialization script for `raw_messages` and `transactions` tables
- [ ] Implement `POST /api/messages` endpoint
    - [ ] Add static `X-API-Key` middleware/dependency
    - [ ] Validate message body
    - [ ] Save to `raw_messages` with UTC timestamp
- [ ] Write unit tests for message ingestion and security

## Phase 2: Regex Engine (Transaction Processing)
- [ ] Develop `services/transaction_generator.py`
    - [ ] Implement robust regex for INR amounts (`₹`, `Rs`, `Rs.`, `rupees`, `paid`, `spent`)
    - [ ] Create logic to fetch unprocessed messages and extract data
    - [ ] Handle edge cases (commas in numbers, multiple amounts in one message)
- [ ] Create `generate_transactions.py` entry point for cron
- [ ] Implement state update: mark messages as `processed=true` (and `parse_failed=true` if applicable)
- [ ] Test regex engine against a suite of sample SMS strings

## Phase 3: Dashboard API (Analytics & Management)
- [ ] Implement `GET /api/transactions`
    - [ ] Support date filters (`?date=`, `?from=&to=`)
    - [ ] Include original raw message details via join
- [ ] Implement `PATCH /api/transactions/{id}`
    - [ ] Allow updating `category` and `description`
    - [ ] Validate category against allowed list
- [ ] Implement `GET /api/stats`
    - [ ] Aggregate total spend by category for a given range
    - [ ] Compute 7-day spend trend data
    - [ ] Calculate "Today's Haul" and flag count
- [ ] Add error handling and logging for all endpoints

## Phase 4: React Dashboard (Frontend)
- [ ] Bootstrap React application with TypeScript and Tailwind CSS
- [ ] Configure theme system (CSS variables + Light/Dark mode toggle)
- [ ] Create API client layer (using `fetch` or `axios`)
- [ ] Build UI Components:
    - [ ] **Header:** Logo, Date Filters, Theme Toggle
    - [ ] **Stat Row:** "Today's Haul", "Weekly Total", etc.
    - [ ] **Transaction List:** Grouped by date, inline category picker, flags
    - [ ] **Charts:** Category breakdown (Donut/Bar) and 7-day trend (Bar)
- [ ] Implement state management for date ranges and global stats

## Phase 5: Automation & Deployment
- [ ] Finalize `Dockerfile` for Python/FastAPI environment
- [ ] Setup `compose.yaml` to orchestrate backend and database persistence
- [ ] Add documentation for setting up the iPhone Shortcut
- [ ] Create a `setup_cron.sh` or include instructions for scheduling `generate_transactions.py`
- [ ] Conduct a full end-to-end test from SMS ingest to dashboard visualization
