echo "worker.js PID:"
ps -ax | grep -v "grep" | grep worker.js

echo ""
echo "main.js PID:"
ps -ax | grep -v "grep" | grep main.js