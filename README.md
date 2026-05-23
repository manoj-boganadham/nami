# Nami — Personal Finance Assistant (v1)

> *"Every berry counts."*  
> Inspired by Nami, the Straw Hat crew's navigator and treasurer.

Nami is a personal finance tracking system that captures transaction SMS messages (via an iPhone Shortcut), extracts spending amounts, and aggregates them into a nautical-themed dashboard. 

V1 features manual categorization (no AI) for 100% precision.

---

## Tech Stack & Project Architecture

- **Backend:** Python (FastAPI), SQLite database via SQLAlchemy.
- **Frontend:** React (TypeScript) + Tailwind CSS, charts powered by Recharts.
- **Extraction:** Multi-priority Regex-based parsing engine.
- **Deployment:** Containerized via Docker / Podman.
- **Automation:** Scheduled task execution using system `cron`.

```
finance-manager/
├── main.py                  # FastAPI server entry point
├── generate_transactions.py # Standalone parser called by cron
├── db/
│   ├── database.py          # SQLite engine config
│   ├── models.py            # SQLAlchemy models
│   └── init_db.py           # Database initialisation
├── routes/
│   ├── messages.py          # POST /api/messages (ingestion)
│   ├── transactions.py      # GET/PATCH /api/transactions
│   └── stats.py             # GET /api/stats (analytics)
├── services/
│   └── transaction_generator.py # Regex amount extractor logic
├── design/                  # System and Low-level design docs
├── frontend/                # Vite React dashboard codebase
└── setup_cron.sh            # Automation cron setup script
```

---

## Getting Started

### 1. Configuration

Copy the configuration template to create your local variables:
```bash
cp .env.example .env
```

Parameters inside `.env`:
- `API_KEY`: A secret key used to secure the ingestion endpoint.
- `LARGE_SPEND_THRESHOLD`: Transactions above this amount (default: ₹2000) are flagged.
- `DATABASE_PATH`: Path to the SQLite database (default: `./finance.db`).
- `PORT`: Port the API runs on (default: `8000`).
- `CRON_SCHEDULE`: Cron trigger expression (default: `0 23 * * *` - 11:00 PM daily).

---

### 2. Run Containerized (Recommended)

Ensure you have **Docker** or **Podman** installed.

Build and start the application:
```bash
podman-compose up -d --build
```
*Note: If using Docker, swap `podman-compose` with `docker compose` or `docker-compose`.*

This will:
1. Compile the React frontend using a multi-stage builder.
2. Spin up the FastAPI server on port `8000`.
3. Mount the database file (`finance.db`) to the host to ensure data persistence.

Test the server with health check:
```bash
curl http://localhost:8000/
```

Access the dashboard:
Open `http://localhost:8000/dashboard` in your browser.

---

### 3. Local Development (Optional)

If running python locally:

1. Create a virtual environment and install dependencies:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. Initialize the database:
   ```bash
   PYTHONPATH=. python db/init_db.py
   ```

3. Run FastAPI locally:
   ```bash
   PYTHONPATH=. python main.py
   ```

---

## Ingesting Messages via iPhone Shortcut

You can set up an iOS Shortcut to forward transaction SMS texts to your endpoint automatically.

### Shortcut Configuration Steps
1. Open the **Shortcuts** app on your iPhone.
2. Go to **Automation** tab and tap **+** (New Automation).
3. Select **Transaction** or **Message** (e.g. When I receive a message containing "debited" or "spent").
4. Add the following actions to the workflow:
   - **Get Text from Input** (Select Shortcut Input / Message content).
   - **Get Contents of URL**:
     - **URL**: `http://<your-server-ip>:8000/api/messages`
     - **Method**: `POST`
     - **Headers**:
       - `X-API-Key`: `<Your-Configured-API-Key>`
       - `Content-Type`: `application/json`
     - **Request Body (JSON)**:
       - Add a text field `message` with the message content variable.

---

## Transaction Generation & Cron Scheduling

Nami ingests raw messages in real time, but parses them in batches to reduce server load and allow manual review.

### Run Parser Manually
```bash
PYTHONPATH=. ./venv/bin/python generate_transactions.py
```

### Schedule Daily Run
Run the helper script to register the scheduler in your system crontab:
```bash
bash setup_cron.sh
```
Or add the following line to `crontab -e`:
```cron
0 23 * * * cd /path/to/finance-manager && PYTHONPATH=. ./venv/bin/python generate_transactions.py >> cron.log 2>&1
```

---

## Visual Themes

Nami features a toggle between two high-fidelity themes in the top-right header:
1. **Treasure Ledger (Light):** Parchment backgrounds (`#fdfaf5`), warm sand borders, and gold accents (`#e89220`).
2. **Deep Voyage (Dark):** Navy panels (`#0a0e1a`), slate texts, and glowing gold accents.
Theme preferences are persisted in browser `localStorage`.
