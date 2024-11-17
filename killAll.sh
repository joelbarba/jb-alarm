pid=`ps -ax | grep -v "grep" | grep worker.js | awk ${print $1}`
echo "worker.js PID: $pid"
if [ $pid ]; then
  kill -9 $pid
  echo "Worker Killed"
fi

echo ""
pid=`ps -ax | grep -v "grep" | grep main.js | awk ${print $1}`
echo "main.js PID: $pid"
if [ $pid ]; then
  kill -9 $pid
  echo "Main Killed"
fi