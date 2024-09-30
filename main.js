// const Gpio = require('onoff').Gpio;
import { Gpio } from 'onoff';
const door     = new Gpio(16, 'in', 'both',   { debounceTimeout: 100 });
const button   = new Gpio(4,  'in', 'rising', { debounceTimeout: 100 });
const greenLed = new Gpio(17, 'out');
const redLed   = new Gpio(18, 'out');

// Mocking
// const greenLed = { writeSync: (v) => console.log(`GREEN: ${!!v}`) };
// const redLed = { writeSync: (v) => console.log(`RED: ${!!v}`) };
// const door = (function() { let callback = () => {}; return { trigger: (v) => callback(false, v), watch: (fn) => callback = fn, readSync: () => {} }; }());
// const button = (function() { let callback = () => {}; return { trigger: (v) => callback(false, v), watch: (fn) => callback = fn }; }());

console.log('main.js running...');

// setTimeout(_ => door.trigger(1), 5000);


let isActive = false; // whether the alarm is active
let isOpen = false; // whether the door is open
let ledInt; // blinking let interval

isOpen = !!door.readSync();
console.log(getTime(), `The door is ${isOpen ? 'open' : 'closed'}`);

turnLeds();

button.watch((err, value) => {
  if (err) { console.error('Button error'); throw err; }
  activation();
});

door.watch((err, value) => {
  if (err) { console.error('Door sensor error'); throw err; }
  isOpen = !!value;
  console.log(getTime(), value, `Door ${isOpen ? 'open' : 'closed'}`);
  addLog('door');
  turnLeds();
});

process.on('SIGINT', _ => {
  activation(false);
  turnLedsOff();
  process.exit(0);
});


function activation(newValue = !isActive) {
  const writeLog = isActive != newValue;
  isActive = newValue;
  if (ledInt) { clearInterval(ledInt); }
  if (isActive) {
    console.log(getTime(), `ALARM activated`);
    greenLed.writeSync(1);
    ledInt = setInterval(_ => { greenLed.writeSync(1); setTimeout(_ => greenLed.writeSync(0), 70)}, 1500);
  } else {
    console.log(getTime(), `ALARM deactivated`);
  }
  turnLeds();
  if (writeLog) { addLog('alarm'); }
}

function turnLeds() {
  redLed.writeSync(isOpen ? 1 : 0); // Turn red on if door open
  if (!isActive) { greenLed.writeSync(0); }
}

function turnLedsOff() {
  redLed.writeSync(0);
  greenLed.writeSync(0);
}

const getTime = () => {
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
// Firebase communication
// Adding docs to the doorlog collection for every change
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import * as firestore from 'firebase/firestore';
import * as secrets from './secrets.js';


const app = initializeApp(secrets.firebaseConfig);  // Initialize Firebase
const db = firestore.getFirestore(app);

let doorLogsCol; // Ref to the doorlog collection
let unsubscribe;
let newDoc;
const auth = getAuth();
const fireBasePromise = signInWithEmailAndPassword(auth, secrets.userAuth.user, secrets.userAuth.pass).then((userCredential) => {
  console.log('Firebase: Logged in');
  doorLogsCol = firestore.collection(db, 'doorlog');
  if (unsubscribe) { unsubscribe(); }
  unsubscribe = firestore.onSnapshot(doorLogsCol, (snapshot) => updateState(snapshot), (err) => console.error(err));
}).catch((error) => console.error(`Login error: ${error.code} -> ${error.message}`));

function updateState(snapshot) { // Update the status of the Alarm from Firebase
  const logs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  logs.sort((a, b) => new Date(b.time) - new Date(a.time)); // order from latest (right now) to oldest (long ago)
  // console.log('Current Status =', logs[0]);
  const curr = logs[0];
  if (curr?.change === 'alarm' && curr?.time !== newDoc?.time) {
    if (curr?.alarm === 'active')   { console.log(getTime(), `ALARM activated (from Firebase)`); }
    if (curr?.alarm === 'inactive') { console.log(getTime(), `ALARM deactivated (from Firebase)`); }
  }
  isActive = logs[0]?.alarm === 'active';
}

async function addLog(change = 'door') {
  try {
    await fireBasePromise;  
    newDoc = {
      door: isOpen ? 'open' : 'closed',
      time: getTime(),
      alarm: isActive ? 'active' : 'inactive',
      change, // door | alarm
    };
    const docRef = await firestore.addDoc(doorLogsCol, newDoc);
    // console.log(getTime(), `Log ${docRef.id}`);
  } catch(err) {
    console.log(getTime(), `Error logging to firebase: ${err}`);
  }
}

async function getLogs() {
  const logsSnapshot = await firestore.getDocs(doorLogsCol);
  return logsSnapshot.docs.map(doc => doc.data());
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
webServer.get('/activate',   (req, res) => { activation(true);  res.status(200).send('activated'); });
webServer.get('/deactivate', (req, res) => { activation(false); res.status(200).send('deactivated'); });
webServer.get('/ledsoff',    (req, res) => { turnLedsOff();     res.status(200).send('leds off'); });

// webServer.get('/exit', (req, res) => { res.send('ok'); process.exit(0); });

webServer.get('/logs', async (req, res) => { res.status(200).send(await getLogs()); });

webServer.listen(port, () => console.log(`JBALARM listening on port ${port}!`));