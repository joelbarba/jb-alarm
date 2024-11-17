Quick Setup:

- Control menu from a client: `node menu.js`

- To run the app on Raspberry Pi: `node worker.js &`
  If you don't want the worker, that checks if main.js fails and rerun it, you can also run the app directly with: `node main.js`

- Test the UI locally: `node webServer.js`
  Due to its dependencies, the ui runs as a module, so it can't be served from file:// and it needs to be fetch from an http server.
  To deploy a new version, just git push and netlify will do the job

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

