#!/bin/bash

pid=`pgrep -f main.js`
if [ ! $pid ]; then
  echo "Process not found: pgrep -f main.js"
else
  curl -s -X GET http://localhost:4358/ledsoff
  echo ""
  echo "PID = $pid"
  echo "Killing process $pid"
  kill -9 $pid
fi
exit 0