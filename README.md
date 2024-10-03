There is one collection doorlogs[] where a log is pushed to every time a change happens
A change can be of 2 types: 
change: 'door'   --> When the status of the door changes from/to 'open' <-> 'closed'
change: 'alarm'  --> When the status of the alarm changes from/to 'active' <-> 'inactive'

There are 3 additional documents that are only for control (not part of the logs)
They have a fix ID, and are never deleted (only modified)

000CTRL_door_status     door  = open|closed           This reflects the current status of the door
000CTRL_alarm_status    alarm = active|inactive       This reflects the current status of the alarm
000CTRL_main_app        ping  = yyyy-mm-dd hh24:mi:ss This is updated every 30 seconds with the current time by main.js, so clients can know if the process is up or down.
000CTRL_schedule        activation_time: hh24:mi:ss, deactivation_time: hh24:mi:ss, enabled: bool

# TODOS:
# - Testejar
# - Instalar detector moviment
# - Millorar script de control (run.sh) to cursor arrow selection