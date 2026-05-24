# Nami — Technical Specifications (v3)

This document maps out the specific interface additions and database migration script details for **Nami v3**.

---

## 1. Schema Specifications

### 1.1 `raw_messages` Table
Columns added:
- `category`: `TEXT` (nullable)
- `mode_of_payment`: `TEXT` (nullable)

### 1.2 `transactions` Table
Columns added:
- `mode_of_payment`: `TEXT` (nullable)

---

## 2. API Specifications

### 2.1 Ingest Message
- **Route:** `POST /api/messages` and `/messages`
- **Request Schema:**
  ```json
  {
    "message": "Raw text message",
    "category": "Optional category string",
    "modeOfPayment": "Optional mode of payment string"
  }
  ```

### 2.2 List Transactions
- **Route:** `GET /api/transactions`
- **Response Item Schema:**
  ```json
  {
    "id": 1,
    "amount": 1000.0,
    "category": "Shopping",
    "mode_of_payment": "Card",
    "description": "Store A purchase",
    "timestamp": "2026-05-24T12:00:00Z",
    "created_at": "2026-05-24T12:01:00Z"
  }
  ```

### 2.3 Update Transaction
- **Route:** `PATCH /api/transactions/{id}`
- **Request Schema:**
  ```json
  {
    "category": "Optional string",
    "description": "Optional string",
    "mode_of_payment": "Optional string"
  }
  ```

---

## 3. Migration Queries (`db/init_db.py`)
On startup, Nami will run:
```sql
ALTER TABLE raw_messages ADD COLUMN category TEXT;
ALTER TABLE raw_messages ADD COLUMN mode_of_payment TEXT;
ALTER TABLE transactions ADD COLUMN mode_of_payment TEXT;
```
*(Only running if the columns are detected as missing via PRAGMA inspections).*
