#!/bin/bash

pid=`pgrep -f main.js`
if [ $pid ]; then
  echo "Process already running. Check PID $pid"
  exit 0
fi

echo "Starting up JB-ALARM"
echo ""

cd ~/PROJECTS/JBALARM
pwd

export NVM_DIR="$HOME/.config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# nvm ls
# node -v

echo "Logs at ~/jbalarm.log"
echo "" > ~/jbalarm.log

node main.js
