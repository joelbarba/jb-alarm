echo "worker.js PID:"
ps -ax | grep -v "grep" | grep worker.js # | awk ${print $1}

echo ""
echo "main.js PID:"
ps -ax | grep -v "grep" | grep main.js