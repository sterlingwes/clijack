#!/bin/bash

# Function to show menu
show_menu() {
  echo "Available commands:"
  echo "1. Start server"
  echo "2. Check status"
  echo "3. Show logs"
  echo "4. Exit"
  echo
  echo "Press a key to continue..."
}

# Function to start server
start_server() {
  echo "Starting server..."
  sleep 1
  echo "Server started successfully"
}

# Function to check status
check_status() {
  echo "Checking status..."
  echo "Server is running"
  echo "Uptime: 5 minutes"
}

# Function to show logs
show_logs() {
  echo "Showing logs..."
  echo "[INFO] Server started"
}

# Main loop
while true; do
  show_menu
  read -n 1 input
  echo

  case $input in
    1)
      start_server
      ;;
    2)
      check_status
      ;;
    3)
      show_logs
      ;;
    4)
      echo "Exiting..."
      exit 0
      ;;
    *)
      echo "Unknown command: $input"
      ;;
  esac
  echo
done 