#!/bin/bash

echo ""
pid=`ps -ax | grep -v "grep" | grep worker.js | cut -d " " -f1`
if [ $pid ]; then
  echo "worker.js PID: $pid"
  kill -9 $pid
  echo "Worker Killed"
else
  echo "worker.js PID: NOT FOUND"
fi

echo ""
pid=`ps -ax | grep -v "grep" | grep main.js | cut -d " " -f1`
if [ $pid ]; then
  echo "main.js PID: $pid"
  kill -9 $pid
  echo "Main Killed"
else
  echo "main.js PID: NOT FOUND"
fi

echo ""