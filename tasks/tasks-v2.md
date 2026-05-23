# Nami — Development Tasks (v2)

## Phase 1: Backend API Additions
- [ ] Implement `GET /api/raw_messages`
  - [ ] Support status query parameter (`?status=all|pending|processed|failed`)
  - [ ] Support case-insensitive text search parameter (`?search=keyword`)
  - [ ] Order results by `received_at` descending
- [ ] Implement `POST /api/raw_messages/{id}/reprocess`
  - [ ] Pull target raw message from database
  - [ ] Run amount extractor
  - [ ] If amount found, upsert corresponding transaction
  - [ ] If amount not found, delete any existing transaction for the message and mark `parse_failed = true`
  - [ ] Mark message as `processed = true`
- [ ] Incorporate routes in `routes/messages.py` or new router
- [ ] Write unit tests for new v2 API endpoints (`tests/test_v2_api.py`)

## Phase 2: React Dashboard "Log Book" Tab
- [ ] Introduce tab state (`activeTab` as `"chart"` or `"logbook"`) inside `App.tsx`
- [ ] Add visual tab toggle buttons in the Header component
- [ ] Create `components/LogBookPanel.tsx` component
  - [ ] Implement search bar and status filter dropdown inputs
  - [ ] Render messages in a list table with color badges (Green for Parsed, Gold for Pending, Red for Failed)
  - [ ] Add a functional "Reprocess" button next to pending/failed logs
  - [ ] Implement query loading/error displays
- [ ] Integrate tab state views in `App.tsx` to mount `LogBookPanel` when active

## Phase 3: Verification & Build
- [ ] Build and verify frontend changes compiling correctly
- [ ] Execute pytest testing suite on the new test assertions
- [ ] Conduct E2E verification of manual reprocessing from dashboard to transaction charts
