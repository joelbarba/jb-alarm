#!/bin/bash
echo ""
echo '1 -->  START: ssh -n -f pi@192.168.1.135 "sh background_startup.sh"'
echo '2 -->  STOP:  ssh -n -f pi@192.168.1.135 "sh terminate.sh"'
echo '3 -->  CHECK: ssh -n -f pi@192.168.1.135 "pgrep -f main.js"'
echo '4 -->  SCAN:  scan network for IP'
echo '5 -->  ACTIVATE  : curl -X GET http://192.168.1.135:4358/activate'
echo '6 -->  DEACTIVATE: curl -X GET http://192.168.1.135:4358/deactivate'
echo '7 -->  SSH INTO: ssh pi@192.168.1.135'

read x
echo ""
if [[ "$x" == "1" ]]; then
  ssh -n -f pi@192.168.1.135 "sh background_startup.sh"
fi
if [[ "$x" == "2" ]]; then
  ssh -n -f pi@192.168.1.135 "sh terminate.sh"
fi
if [[ "$x" == "3" ]]; then
  ssh -n -f pi@192.168.1.135 "pgrep -f main.js"
fi
if [[ "$x" == "4" ]]; then
  nmap -sn 192.168.1.0/24
fi
if [[ "$x" == "5" ]]; then
  curl -X GET http://192.168.1.135:4358/activate
fi
if [[ "$x" == "6" ]]; then
  curl -X GET http://192.168.1.135:4358/deactivate
fi
if [[ "$x" == "7" ]]; then
  ssh pi@192.168.1.135
fi

# TODOS:
# Add code to github + update script to pull auto from pi
# Soldar placa
# Instalar sensor porta + cables
# UI to read and "sound" the alarm (mobile web app)
# Instalar detector moviment
# Instalar sirena alarma



# ssh -n -f pi@192.168.1.135 "sh -c 'cd /home/pi; nohup sh ~/startup.sh > /dev/null 2>&1 &'"
# ssh -n -f pi@192.168.1.135 "sh -c 'cd /home/pi; nohup sh ~/startup.sh &'"
# ssh -n -f pi@192.168.1.135 "nohup sh ~/startup.sh &"
# nohup sh ~/startup.sh &
# tail -f nohup.out

# id=`pgrep -f main.js`
# pkill -f startup.sh
# pkill -f node_main.js
# ps aux | grep startup.sh


# To boot automatically on startup
# sudo nano /etc/rc.local
# lxterminal --command="/bin/bash -c '~/startup.sh; read'"