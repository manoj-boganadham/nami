# Implement Custom Ingestion Fields & Mode of Payment (v3)

We will update Nami to accept optional `category` and `modeOfPayment` fields on raw message ingestion. These fields will persist in the database, propagate to transaction records during processing, and be editable on the dashboard.

## User Review Required

> [!IMPORTANT]
> **Database Schema Migration:** We need to add:
> - `category` (TEXT, Nullable) and `mode_of_payment` (TEXT, Nullable) to the `raw_messages` table.
> - `mode_of_payment` (TEXT, Nullable) to the `transactions` table.
> Since SQLite doesn't natively support automated migrations without Alembic, we will update the startup script (`db/init_db.py`) to check if these columns exist and run `ALTER TABLE` SQL statements dynamically if they are missing. This prevents database data loss for existing users while adding the new columns seamlessly!

> [!NOTE]
> **Modes of Payment:** We will define standard payment modes: `UPI` (📱), `Card` (💳), `Cash` (💵), and `Net Banking` (🌐). Users will be able to select and update the mode of payment inline on the transaction list, similar to how they assign categories.

---

## Proposed Changes

### Database Layer (Schema & Models)

#### [MODIFY] [models.py](file:///Users/bogaman/Documents/Projects/finance-manager/db/models.py)
- Add `category` (String, nullable) and `mode_of_payment` (String, nullable) to `RawMessage` model.
- Add `mode_of_payment` (String, nullable) to `Transaction` model.

#### [MODIFY] [init_db.py](file:///Users/bogaman/Documents/Projects/finance-manager/db/init_db.py)
- Update init script to dynamically check if the new columns exist in `raw_messages` and `transactions`, running `ALTER TABLE ADD COLUMN` if they are missing.

---

### Backend API Updates

#### [MODIFY] [messages.py](file:///Users/bogaman/Documents/Projects/finance-manager/routes/messages.py)
- Update Pydantic schemas for `POST /api/messages` to accept optional `category` and `modeOfPayment` (which maps to `mode_of_payment`).
- Store these fields in `RawMessage` during ingestion.
- Update `GET /api/raw_messages` to return the new fields.
- Update `/api/raw_messages/{id}/reprocess` to copy `category` and `mode_of_payment` to the `Transaction` record.

#### [MODIFY] [transaction_generator.py](file:///Users/bogaman/Documents/Projects/finance-manager/services/transaction_generator.py)
- Update batch processing logic (`process_unprocessed_messages`) to copy `category` and `mode_of_payment` from the `RawMessage` into the newly created `Transaction`.

#### [MODIFY] [transactions.py](file:///Users/bogaman/Documents/Projects/finance-manager/routes/transactions.py)
- Update `TransactionUpdate` schema in `PATCH /api/transactions/{id}` to accept optional `mode_of_payment`.
- Update `format_transaction` to return `mode_of_payment` in the output dictionary.

#### [NEW] [test_v3_api.py](file:///Users/bogaman/Documents/Projects/finance-manager/tests/test_v3_api.py)
- Add unit tests verifying:
  - Ingestion with custom `category` and `modeOfPayment`.
  - Propagation of these fields to the transaction table on reprocessing.
  - Patching of `mode_of_payment` via the API.

---

### Frontend Dashboard Updates

#### [MODIFY] [TransactionList.tsx](file:///Users/bogaman/Documents/Projects/finance-manager/frontend/src/components/TransactionList.tsx)
- Add a column or inline pill badge displaying the Mode of Payment.
- Build an inline dropdown selector to change the payment mode (UPI, Card, Cash, Net Banking, or clear it).

#### [MODIFY] [App.tsx](file:///Users/bogaman/Documents/Projects/finance-manager/frontend/src/App.tsx)
- Update network state mappings to fetch and submit `mode_of_payment` modifications during inline row updates.

---

## Verification Plan

### Automated Tests
- Run `PYTHONPATH=. ./venv/bin/pytest` to verify ingestion payloads and data propagation.

### Manual Verification
- Ingest a transaction with custom metadata:
  ```bash
  curl -X POST http://localhost:8000/messages \
    -H "Content-Type: application/json" \
    -d '{"message": "Dinner Rs 1200", "category": "Food", "modeOfPayment": "UPI"}'
  ```
- Reprocess the message and verify that the resulting transaction is created with the category pre-filled as `Food` and the mode of payment pre-filled as `UPI`.
- Open the dashboard, verify the payment mode pill is shown, and change it to `Card` manually to test the update trigger.
