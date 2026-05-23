import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# Load env variables (loads standard .env, falls back to nami_config.env)
load_dotenv()
load_dotenv("nami_config.env")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Nami Personal Finance Assistant", version="1.0.0")

# Import and mount routes
from routes.messages import router as messages_router
from routes.transactions import router as transactions_router
from routes.stats import router as stats_router

app.include_router(messages_router)
app.include_router(transactions_router)
app.include_router(stats_router)

# Serve dashboard static files if they exist
frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")

@app.get("/dashboard")
async def serve_dashboard():
    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="Dashboard frontend not built yet.")

# Mount the static directory at root / for assets.
# We define API routes first so they don't get shadowed by static file hosting.
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")
else:
    @app.get("/")
    async def root_placeholder():
        return {
            "status": "success",
            "message": "Nami API is running. Build frontend/dist to view dashboard.",
            "api_doc": "/docs"
        }

if __name__ == "__main__":
    import uvicorn
    # PORT defaults to 8000
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
