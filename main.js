// const Gpio = require('onoff').Gpio;
import { Gpio } from 'onoff';
const door     = new Gpio(16, 'in', 'both',   { debounceTimeout: 500 });
const button   = new Gpio(4,  'in', 'rising', { debounceTimeout: 100 });
const greenLed = new Gpio(17, 'out');
const redLed   = new Gpio(18, 'out');
const siren    = new Gpio(5,  'out');
const MAX_RINGING_TIME = 45*1000;
// Mocking
// const greenLed = { writeSync: (v) => console.log(`GREEN: ${!!v}`) };
// const redLed = { writeSync: (v) => console.log(`RED: ${!!v}`) };
// const siren = { writeSync: (v) => console.log(`RED: ${!!v}`) };
// const door = (function() { let callback = () => {}; return { trigger: (v) => callback(false, v), watch: (fn) => callback = fn, readSync: () => {} }; }());
// const button = (function() { let callback = () => {}; return { trigger: (v) => callback(false, v), watch: (fn) => callback = fn }; }());

console.log('main.js running...');

// setTimeout(_ => door.trigger(1), 5000);


let isActive = false; // whether the alarm is active
let isOpen = false; // whether the door is open
let ledInt; // blinking let interval

isOpen = !!door.readSync();
console.log(getTime(), `The door is ${isOpen ? 'open' : 'closed'}`);

syncLeds();

button.watch((err, value) => {
  if (err) { console.error('Button error'); throw err; }
  activation();
});

door.watch((err, value) => {
  if (err) { console.error('Door sensor error'); throw err; }
  if (isOpen === !!value) {
    console.log(getTime(), value, `Door ${isOpen ? 'open' : 'closed'} (sensor glitch - it was already)`);
  } else {
    isOpen = !!value;
    console.log(getTime(), value, `Door ${isOpen ? 'open' : 'closed'}`);
    if (isOpen) { checkAndRing(); }
    
    // If closing the door, and "activation on close" -> Activate the alarm
    if (!isOpen && activateOnClose) { activation(true, 'On close'); activateOnClose = false; }

    addLog('door');
    syncLeds();
  }
});

process.on('SIGINT', _ => {
  activation(false, 'process end');
  turnLedsOff();
  process.exit(0);
});

// Change the status (active/inactive) of the alarm.
// When active, the door opening will make the siren ring.
// When inactive, the door opening/closing does nothing (just turns the red led on/off).
function activation(newValue = !isActive, origin = 'box switch', internal = true) {
  const writeLog = internal && isActive !== newValue;
  isActive = newValue;
  checkAndRing();
  if (ledInt) { clearInterval(ledInt); }
  if (isActive) {
    greenLed.writeSync(1);
    ledInt = setInterval(_ => { greenLed.writeSync(1); setTimeout(_ => greenLed.writeSync(0), 70)}, 1500);  
    console.log(getTime(), `ALARM activated (from ${origin})`);
  } else {
    console.log(getTime(), `ALARM deactivated (from ${origin})`);
  }
  syncLeds();
  if (writeLog) { addLog('alarm'); }
}


function checkAndRing() {
  if (isActive && isOpen) {
    siren.writeSync(1); // If the door opens, ring
    setTimeout(() => siren.writeSync(0), MAX_RINGING_TIME);    
  } else {
    siren.writeSync(0);
  }
}


function syncLeds() {
  redLed.writeSync(isOpen ? 1 : 0); // Turn red on if door open
  if (!isActive) { greenLed.writeSync(0); }
}

function turnLedsOff() {
  redLed.writeSync(0);
  greenLed.writeSync(0);
}



// ---------------------------------------------------------------------------------------
// Firebase communication
// Adding docs to the doorlog collection for every change
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import * as firestore from 'firebase/firestore';
import * as secrets from './secrets.js';


const app = initializeApp(secrets.firebaseConfig);  // Initialize Firebase
const db = firestore.getFirestore(app);

let doorLogsCol; // Ref to the doorlog collection
let ctrlDoorRef;  // Ref to control document for the door status   
let ctrlAlarmRef; // Ref to control document for the alarm status
let ctrlAppRef;   // Ref to control document for the running main.js app
let ctrlSchRef;   // Ref to control document for the activation scheduler
let newDoc;
let schedule = { ini: '00:00', end: '00:00', enabled: false };
let activateOnClose = false;

const auth = getAuth();
const fireBasePromise = signInWithEmailAndPassword(auth, secrets.userAuth.user, secrets.userAuth.pass).then(async (userCredential) => {
  console.log('Firebase: Logged in');
  doorLogsCol = firestore.collection(db, 'doorlog');
  ctrlDoorRef  = firestore.doc(db, 'doorlog', '000CTRL_door_status');
  ctrlAlarmRef = firestore.doc(db, 'doorlog', '000CTRL_alarm_status');
  ctrlAppRef   = firestore.doc(db, 'doorlog', '000CTRL_main_app');
  ctrlSchRef   = firestore.doc(db, 'doorlog', '000CTRL_schedule');

  // Once connected, check if the door status on Firebase (CTRL_door_status) is the same
  // If not the same, change it and add a log to reflect it
  const docSnap = await firestore.getDoc(ctrlDoorRef);
  const doc = docSnap.data();
  const isFirebaseDoorOpen = doc.door !== 'closed';
  if (isFirebaseDoorOpen !== isOpen) { addLog('door'); }


  // React on changes from 000CTRL_alarm_status
  // If the activation changes remotely (from Firebase), sync it and check everything
  firestore.onSnapshot(ctrlAlarmRef, (snap) => { 
    const doc = snap.data();
    if (doc.time !== newDoc?.time) {
      activateOnClose = doc.activate_on_close;
      const isFirebaseAlarmActive = doc.alarm === 'active';
      if (isFirebaseAlarmActive !== isActive) { activation(isFirebaseAlarmActive, 'Firebase', false); }
    }
  });
  
  // React on changes from 000CTRL_schedule
  // Update local values for the activation scheduler
  firestore.onSnapshot(ctrlSchRef, (snap) => { 
    const doc = snap.data();
    schedule.ini = doc.activation_time;
    schedule.end = doc.deactivation_time;
    schedule.enabled = !!doc.enabled;
    // rescheduleActivation();
  });


  firestore.setDoc(ctrlAppRef, { ping: getTime(), app: 'running' });
  setInterval(() => { // Ping a value to CTRL_main_app every 30 seconds
    firestore.setDoc(ctrlAppRef, { ping: getTime(), app: 'running' });
    chechSchedule();
  }, 15*1000);
    
}).catch((error) => console.error(`Login error: ${error.code} -> ${error.message}`));


function chechSchedule() {
  const now = new Date();
  const later = new Date(now.getTime() + 15*1000); // 15 seconds later

  function schTime(time = '00:00') {
    const hours = time.split(':')[0];
    const minutes = time.split(':')[1];
    return new Date(new Date((new Date()).setHours(hours)).setMinutes(minutes));
  }
  const ini = schTime(schedule.ini);
  const end = schTime(schedule.end);

  if (now <= ini && ini < later) { activation(true,  'scheduler'); }
  if (now <= end && end < later) { activation(false, 'scheduler'); }
}

// let timeoutIni;
// let timeoutEnd;
// function rescheduleActivation() {
//   console.log('Scheduling automatic activation', schedule);
//   if (timeoutIni) { clearTimeout(timeoutIni); }
//   if (timeoutEnd) { clearTimeout(timeoutEnd); }
//   if (schedule.enabled) {
//     const now = new Date();
//     function minsToNow(time = '00:00') { // Calculat the minutes left to reach the time
//       const minutesTime = (parseInt(time.split(':')[0])*60) + parseInt(time.split(':')[1]);
//       let diff = minutesTime - ((now.getHours() * 60) + now.getMinutes()); 
//       if (diff < 0) { diff += 1440; }
//       return diff;
//     }
//     const iniTime = minsToNow(schedule.ini);
//     const endTime = minsToNow(schedule.end);
//     console.log(getTime(), `The alarm will activate in ${iniTime} minutes`);
//     console.log(getTime(), `The alarm will deactivate in ${endTime} minutes`);
//     timeoutIni = setTimeout(() => activation(true,  'scheduler'), iniTime * 60 * 1000);
//     timeoutEnd = setTimeout(() => activation(false, 'scheduler'), endTime * 60 * 1000);
//   }
// }




async function addLog(change = 'door') {
  try {
    await fireBasePromise;
    const time = getTime();
    const door = isOpen ? 'open' : 'closed';
    const alarm = isActive ? 'active' : 'inactive';
    if (change === 'door')  { await firestore.setDoc(ctrlDoorRef,  { time: getTime(), door }); }
    if (change === 'alarm') { await firestore.setDoc(ctrlAlarmRef, { time: getTime(), alarm }); }

    newDoc = { door, time, alarm, change };
    // await firestore.addDoc(doorLogsCol, newDoc);
    await firestore.setDoc(firestore.doc(db, 'doorlog', time), newDoc);
  } catch(err) {
    console.log(getTime(), `Error logging to firebase: ${err}`);
  }
}

async function getLogs() {
  const logsSnapshot = await firestore.getDocs(doorLogsCol);
  return logsSnapshot.docs.map(doc => doc.data());
}





function getTime() {
  const now = new Date();
  let currTime = now.getFullYear();
  currTime += '-' + ((now.getMonth()+1)+'').padStart(2, '0');
  currTime += '-' + (now.getDate()+'').padStart(2, '0');
  currTime += ' ' + (now.getHours()+'').padStart(2, '0');
  currTime += ':' + (now.getMinutes()+'').padStart(2, '0');
  currTime += ':' + (now.getSeconds()+'').padStart(2, '0');
  currTime += '.' + (now.getMilliseconds()+'').padStart(3, '0');
  return currTime;
}


// ---------------------------------------------------------------------------------------
// Remote control via HTTP
import express from 'express';
const webServer = express();
const port = 4358;

// curl -X GET http://192.168.1.135:4358/ping
// curl -X GET http://192.168.1.135:4358/activate
// curl -X GET http://192.168.1.135:4358/deactivate
// curl -X GET http://192.168.1.135:4358/ledsoff
webServer.get('/ping', (req, res) => res.status(200).send('pong'));
webServer.get('/activate',   (req, res) => { activation(true,  'http'); res.status(200).send('activated'); });
webServer.get('/deactivate', (req, res) => { activation(false, 'http'); res.status(200).send('deactivated'); });
webServer.get('/ledsoff',    (req, res) => { turnLedsOff();     res.status(200).send('leds off'); });

// webServer.get('/exit', (req, res) => { res.send('ok'); process.exit(0); });

webServer.get('/logs', async (req, res) => { res.status(200).send(await getLogs()); });

webServer.listen(port, () => console.log(`JBALARM listening on port ${port}!`));