#!/bin/bash

# Get the absolute path to the project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_EXEC="$PROJECT_DIR/venv/bin/python"
SCRIPT_EXEC="$PROJECT_DIR/generate_transactions.py"
LOG_FILE="$PROJECT_DIR/cron.log"

echo "=================================================="
echo "Nami Transaction Generator Cron Setup"
echo "=================================================="

# Check if virtual environment exists
if [ ! -f "$PYTHON_EXEC" ]; then
    echo "[-] Error: Python virtual environment not found at $PYTHON_EXEC"
    echo "    Please create it using: python3 -m venv venv && ./venv/bin/pip install -r requirements.txt"
    exit 1
fi

# Check if script exists
if [ ! -f "$SCRIPT_EXEC" ]; then
    echo "[-] Error: SCRIPT not found at $SCRIPT_EXEC"
    exit 1
fi

# Ensure generate_transactions.py is executable
chmod +x "$SCRIPT_EXEC"

# Read CRON_SCHEDULE from nami_config.env or .env, default to "0 23 * * *"
CRON_SCHEDULE="0 23 * * *"
if [ -f "$PROJECT_DIR/nami_config.env" ]; then
    ENV_VAL=$(grep -E "^CRON_SCHEDULE=" "$PROJECT_DIR/nami_config.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ ! -z "$ENV_VAL" ]; then
        CRON_SCHEDULE="$ENV_VAL"
    fi
elif [ -f "$PROJECT_DIR/.env" ]; then
    ENV_VAL=$(grep -E "^CRON_SCHEDULE=" "$PROJECT_DIR/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ ! -z "$ENV_VAL" ]; then
        CRON_SCHEDULE="$ENV_VAL"
    fi
fi

# Define the crontab job line
CRON_JOB="$CRON_SCHEDULE cd $PROJECT_DIR && PYTHONPATH=. $PYTHON_EXEC $SCRIPT_EXEC >> $LOG_FILE 2>&1"

echo "[+] Target Cron Job:"
echo "    $CRON_JOB"
echo "=================================================="

# Check if the job already exists in crontab
crontab -l 2>/dev/null | grep -F "$SCRIPT_EXEC" >/dev/null
if [ $? -eq 0 ]; then
    echo "[!] A cron job for generate_transactions.py is already scheduled."
    echo "[!] To modify, run: crontab -e"
    exit 0
fi

# Ask if they want to apply
echo "Would you like to add this job to your crontab? (y/n)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    # Add to crontab
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "[+] Successfully added job to crontab!"
    echo "[+] You can verify with: crontab -l"
else
    echo "[-] Setup cancelled. You can manually add the job using 'crontab -e'."
fi
