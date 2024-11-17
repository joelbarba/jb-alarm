#!/bin/bash

pid=`pgrep -f main.js`
if [ $pid ]; then
  echo "Process already running. Check PID $pid"
  exit 0
fi

echo "Starting up JB-ALARM"
echo ""

cd ~/DEV/JB-ALARM
pwd

export NVM_DIR="$HOME/.config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# nvm ls
# node -v
pid=`pgrep -f main.js`

echo "Logs at ~/jbalarm.log"
echo "" > ~/jbalarm.log
echo "main.js PID = $pid" > ~/jbalarm.log
echo "" > ~/jbalarm.log

node main.js


# while [ true ]; do
#   pid=`cat main-pid.txt`
#   isRunning=`ps -p $pid -o pid=`
#   echo "Is PID $pid running? ---> $isRunning" 
#   if [ ! $isRunning ]; then
#     echo "Nope, it is not"
#     node dumb.js &
#   fi
#   sleep 4s
# done

