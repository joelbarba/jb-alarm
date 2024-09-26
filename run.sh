#!/bin/bash
ip=$1
if [[ "$1" == "" ]]; then ip="192.168.1.135"; fi


while [ true ]
do
  echo ""
  echo "IP = $ip"
  echo ""
  echo "1 -->  START:       ssh -n -f pi@$ip \"sh background_startup.sh\""
  echo "2 -->  STOP:        ssh -n -f pi@$ip \"sh terminate.sh\""
  echo "3 -->  CHECK:       ssh -n -f pi@$ip \"pgrep -f main.js\""
  echo "4 -->  ACTIVATE  :  curl -X GET http://$ip:4358/activate"
  echo "5 -->  DEACTIVATE:  curl -X GET http://$ip:4358/deactivate"
  echo "6 -->  SCAN:        scan network for IP"
  echo "7 -->  SSH PI:      ssh pi@$ip"
  echo "8 -->  GIT PUSH:    Commit current code + push + pull from pi"
  read x
  echo ""
  if [[ "$x" == "1" ]]; then
    ssh -n -f pi@$ip "sh background_startup.sh"
  fi
  if [[ "$x" == "2" ]]; then
    ssh -n -f pi@$ip "sh terminate.sh"
  fi
  if [[ "$x" == "3" ]]; then
    ssh -n -f pi@$ip "pgrep -f main.js"
  fi
  if [[ "$x" == "4" ]]; then
    curl -X GET http://$ip:4358/activate
  fi
  if [[ "$x" == "5" ]]; then
    curl -X GET http://$ip:4358/deactivate
  fi
  if [[ "$x" == "6" ]]; then
    nmap -sn 192.168.1.0/24
    echo ""
    echo "Enter IP:"
    read ip
  fi
  if [[ "$x" == "7" ]]; then
    ssh pi@$ip
  fi
  if [[ "$x" == "8" ]]; then
    git add -A
    echo "Enter your commit message:"
    read msg
    git commit -m "$msg"
    git push origin master
    ssh -n -f pi@$ip "sh update_jbalarm.sh"
  fi
done

# TODOS:
# OK  Add code to github + update script to pull auto from pi
# OK  Soldar placa
# Instalar sensor porta + cables
# UI to read and "sound" the alarm (mobile web app)
# Instalar detector moviment
# Instalar sirena alarma


# git add -A && git commit -m 'change scripts' && git push origin master


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