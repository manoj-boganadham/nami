# Nami — Development Tasks (v3)

## Phase 1: Database Migrations
- [ ] Add `category` and `mode_of_payment` columns to `RawMessage` model (`db/models.py`)
- [ ] Add `mode_of_payment` column to `Transaction` model (`db/models.py`)
- [ ] Implement dynamic table column alter migrations inside `db/init_db.py`

## Phase 2: Ingestion & Processing Pipeline
- [ ] Update `POST /api/messages` Pydantic payload parser schema to validate `category` and `modeOfPayment` (`routes/messages.py`)
- [ ] Store fields in `RawMessage` during ingestion
- [ ] Update batch process `process_unprocessed_messages` to copy `category` and `mode_of_payment` (`services/transaction_generator.py`)
- [ ] Update manual reprocess to copy `category` and `mode_of_payment` (`routes/messages.py`)

## Phase 3: Transaction List & Update APIs
- [ ] Add `mode_of_payment` to transaction serialization formats (`routes/transactions.py`)
- [ ] Update `PATCH /api/transactions/{id}` Pydantic schema to validate and edit `mode_of_payment`
- [ ] Write unit tests `tests/test_v3_api.py`

## Phase 4: Frontend Payment Selector Integration
- [ ] Create payment mode style variables mapping (`UPI`, `Card`, `Cash`, `Net Banking`, `None`) inside `components/TransactionList.tsx`
- [ ] Build a styled native `<select>` dropdown next to the category selector in `components/TransactionList.tsx`
- [ ] Add update bindings to `App.tsx` to handle payment mode updates

## Phase 5: Verification & Run
- [ ] Verify test suite passes without compilation errors
- [ ] Conduct end-to-end testing with curl and dashboard visual feedback
