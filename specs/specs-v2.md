# Nami — Technical Specifications (v2)

This specification details the design for the new Log Book tab and reprocessing system in **Nami v2**.

---

## 1. Overview & Objectives

The primary goal of v2 is to provide administrative transparency over the ingestion pipeline. Since transaction extraction is batch regex-driven, users need a method to review unparsed, raw, or conversational SMS texts to verify that no expenses were skipped, and to trigger reprocessing if needed.

---

## 2. API Specifications

### 2.1 Retrieve Ingest Logs
- **Route:** `GET /api/raw_messages`
- **Controller Logic:**
  ```python
  @router.get("/raw_messages")
  def get_raw_messages(status: str = "all", search: str = None, db: Session = Depends(get_db)):
      query = db.query(RawMessage)
      
      # Status filter
      if status == "pending":
          query = query.filter(RawMessage.processed == False)
      elif status == "processed":
          query = query.filter(RawMessage.processed == True, RawMessage.parse_failed == False)
      elif status == "failed":
          query = query.filter(RawMessage.processed == True, RawMessage.parse_failed == True)
          
      # Text search
      if search:
          query = query.filter(RawMessage.message.ilike(f"%{search}%"))
          
      # Sorting (newest first)
      return query.order_by(RawMessage.received_at.desc()).all()
  ```

### 2.2 On-Demand Message Reprocessing
- **Route:** `POST /api/raw_messages/{id}/reprocess`
- **Controller Logic:**
  - Pull raw message.
  - Attempt extract.
  - If success, upsert transaction:
    - Search for existing transaction by `raw_message_id`. If exists, update its `amount` and `timestamp`. If not, create a new one.
  - If fail, delete existing transaction by `raw_message_id` (if exists) and mark `parse_failed = True`.
  - Mark raw message as `processed = True`.
  - Return operation status and the updated message structure.

---

## 3. UI/UX Specifications

- **Views:**
  - Dashboard defaults to "The Chart Room" tab.
  - User can toggle to "The Log Book" tab.
- **Log Book components:**
  - Search bar + status filter selectors.
  - Responsive table showing messages, received date (formatted locally), and colored status badges.
  - "Reprocess" icon button for failed or pending records, which spins when active.
