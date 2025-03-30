#!/bin/bash

show_menu() {
  echo -e "\nAvailable commands:"
  echo "1. Start server"
  echo "2. Check status"
  echo "3. Show logs"
  echo "4. Exit"
  echo -e "\nPress a key to continue..."
}

# Show initial menu
show_menu

# Read input in a loop
while true; do
  # Read a single character silently (no need for Enter)
  read -n 1 -s key

  case $key in
    1)
      echo -e "\nStarting server..."
      echo "Server started successfully!"
      show_menu
      ;;
    2)
      echo -e "\nChecking status..."
      echo "Server is running"
      echo "Uptime: 5 minutes"
      show_menu
      ;;
    3)
      echo -e "\nShowing logs..."
      echo "[INFO] Server started"
      echo "[INFO] Connected to database"
      echo "[INFO] Listening on port 3000"
      show_menu
      ;;
    4)
      echo -e "\nExiting..."
      exit 0
      ;;
    *)
      # Only show menu for invalid input
      if [[ -n "$key" ]]; then
        echo -e "\nUnknown command: $key"
        show_menu
      fi
      ;;
  esac
done 