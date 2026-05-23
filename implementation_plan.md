# Implement Nami Log Book Tab (v2)

We will implement Nami v2 to add a new "Log Book" tab to the dashboard, allowing users to inspect raw message ingestion logs, filter/search them, and trigger on-demand reprocessing of pending or failed messages.

## User Review Required

> [!NOTE]
> **Upsert / Clean Delete Logic for Reprocessing:** When manually triggering `/api/raw_messages/{id}/reprocess`:
> - If the parser successfully extracts an amount, it will search for an existing transaction matching `raw_message_id`. If it exists, it updates it. If not, it creates a new one.
> - If the parser fails to extract an amount, any existing transaction matching `raw_message_id` will be deleted from the database to ensure data integrity, and the raw message is marked as `parse_failed = true`.
> This guarantees that the transaction ledger remains consistent with the raw messages.

---

## Proposed Changes

### Backend API Additions

We will implement raw message querying and on-demand reprocessing endpoints inside `routes/messages.py`.

#### [MODIFY] [messages.py](file:///Users/bogaman/Documents/Projects/finance-manager/routes/messages.py)
- Implement `GET /api/raw_messages` to fetch logs. Supports query parameters `status` (`all`, `pending`, `processed`, `failed`) and `search` (case-insensitive text search).
- Implement `POST /api/raw_messages/{id}/reprocess` which triggers the amount extractor on a specific raw message and upserts or deletes the corresponding transaction.

#### [NEW] [test_v2_api.py](file:///Users/bogaman/Documents/Projects/finance-manager/tests/test_v2_api.py)
- Write unit tests for message status filters, text searching, and the reprocessing pipeline behavior (upsert vs cleanup).

---

### React Frontend Dashboard (Log Book Tab)

We will expand the React interface to accommodate the new tab, filtering controls, and the raw messages overview.

#### [NEW] [LogBookPanel.tsx](file:///Users/bogaman/Documents/Projects/finance-manager/frontend/src/components/LogBookPanel.tsx)
- Build a responsive table to display raw message entries with ID, text, received date, and status badges.
- Add status pills/badges (Parsed/Pending/Failed) in corresponding colors.
- Build search bar inputs and status selection filter dropdowns.
- Embed a "Reprocess" action button with visual loading spinner state.

#### [MODIFY] [App.tsx](file:///Users/bogaman/Documents/Projects/finance-manager/frontend/src/App.tsx)
- Create tab state `activeTab` ("chart" vs "logbook").
- Integrate tab selection segmented buttons into the header, next to the date filters.
- Swap the dashboard grids (analytics charts, category cards) for the `LogBookPanel` when active.
- Ensure that reprocessing raw messages triggers cache refresh on general metrics (Weekly Total, Today's Haul).

---

## Verification Plan

### Automated Tests
- Run `pytest` to execute tests in `tests/test_v2_api.py`:
  - `GET /api/raw_messages` filters by pending, processed, failed, and search filters.
  - `POST /api/raw_messages/{id}/reprocess` verifies upserting valid transactions and deleting transactions when parsing fails.

### Manual Verification
- Deploy using Docker/local environment.
- Send a conversational SMS text payload (e.g. "OTP is 12345") using curl.
- Open the Log Book tab on the dashboard, see the message highlighted as "Failed" (since it has no amount).
- Send a transaction SMS text payload (e.g. "Spent Rs. 650 at supermarket"). See it highlighted as "Pending" or run the parser to see it as "Parsed".
- Click the "Reprocess" button on a log and verify status shifts and ledger values update dynamically.
