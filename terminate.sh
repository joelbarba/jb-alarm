#!/bin/bash

id=`pgrep -f main.js`
if [ ! $id ]; then
  echo "Process not found: pgrep -f main.js"
else
  curl -X GET http://localhost:4358/ledsoff
  echo ""
  echo "PID = $id"
  echo "Killing process $id"
  kill -9 $id
fi
exit 0