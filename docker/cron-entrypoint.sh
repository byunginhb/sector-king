#!/bin/sh

echo "=== Sector King Cron Job Container ==="
echo "Timezone: $(cat /etc/timezone)"
echo "Current time: $(date)"
echo ""

# Create log file
touch /var/log/cron.log

# Run initial data collection on startup (optional)
if [ "$RUN_ON_STARTUP" = "true" ]; then
    echo "Running initial data collection..."
    /usr/bin/python3 /app/scripts/update_data.py
fi

echo "Starting cron daemon..."
echo "Scheduled jobs:"
cat /etc/crontabs/root
echo ""

# Start cron in foreground and tail logs
crond -f -l 2 &
tail -f /var/log/cron.log
