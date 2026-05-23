# Nami Personal Finance Assistant — Walkthrough (v2)

We have successfully implemented all tasks in `tasks/tasks-v2.md`, completing Phase 1 through Phase 3 for the Nami v2 feature set. The "Log Book" tab is fully operational and integrated!

---

## 1. Summary of Changes

### Backend Enhancements (`routes/messages.py`)
- **Get Raw Messages API (`GET /api/raw_messages`):** Supports status filters (`all`, `pending`, `processed`, `failed`) and case-insensitive string searches (`?search=`) to inspect raw SMS messages chronologically.
- **On-Demand Reprocessing API (`POST /api/raw_messages/{id}/reprocess`):** Triggers parsing for a specific raw log. If it succeeds, it creates or updates the transaction. If it fails, any existing transaction is removed to preserve database consistency, and the raw log is marked as `parse_failed = true`.

### Frontend Log Book Interface (`frontend/src/`)
- **`components/LogBookPanel.tsx` [NEW]:** Implements the raw messages table displaying message details, receipt dates (formatted locally), and color status badges.
  - Features a keyword search input and status selector dropdown.
  - Adds a "Reprocess" icon button next to each message, turning into a loading spinner when active.
- **`App.tsx` [MODIFY]:** 
  - Adds an `activeTab` state ("chart" vs "logbook").
  - Renders a segmented tab selector in the header to swap views.
  - Keeps the stats cards and `NamiNavigator` sidebar visible across both tabs.
  - Binds reprocessing success callbacks to refresh global budget metrics dynamically.

---

## 2. Verification & Testing

### 2.1 Automated Tests (`tests/test_v2_api.py`)
We added new backend assertions verifying:
- Status filters (`status=pending`, `status=processed`, `status=failed`).
- Message text searches.
- Reprocessing flow successes (creating and updating transactions).
- Reprocessing flow failures (deleting obsolete transaction records).

**Execution Results:**
All 9 unit tests passed successfully on Python 3.9 in 0.35s:
```bash
$ PYTHONPATH=. ./venv/bin/pytest
============================= test session starts ==============================
platform darwin -- Python 3.9.6, pytest-8.4.2, pluggy-1.6.0
rootdir: /Users/bogaman/Documents/Projects/finance-manager
plugins: anyio-4.12.1
collected 9 items

tests/test_api.py .                                                      [ 11%]
tests/test_ingestion.py ....                                             [ 55%]
tests/test_regex.py ..                                                   [ 77%]
tests/test_v2_api.py ..                                                  [100%]

============================== 9 passed in 0.35s ===============================
```

### 2.2 Manual E2E Verification

1. **Ingest a non-transaction message:**
   ```bash
   curl -X POST http://localhost:8000/api/messages \
     -H "X-API-Key: nami_secret_key_2026" \
     -H "Content-Type: application/json" \
     -d '{"message": "Your OTP verification code is 872365."}'
   ```

2. **Ingest an unprocessed transaction message:**
   ```bash
   curl -X POST http://localhost:8000/api/messages \
     -H "X-API-Key: nami_secret_key_2026" \
     -H "Content-Type: application/json" \
     -d '{"message": "Spent Rs. 400.00 at cinema"}'
   ```

3. **Verify via Log Book Tab:**
   - In the browser, navigate to the Dashboard and tap **The Log Book** tab.
   - Filter status to **Pending** -> the cinema message is displayed.
   - Filter status to **Failed** -> the OTP message is displayed.
   - Search for "cinema" -> only the cinema message appears.
   - Click the **Reprocess** button on the cinema message. The spinner runs, and the message status changes to **Parsed**.
   - Tap **The Chart Room** tab and verify that the cinema spend has been registered in the charts and transaction ledger.
