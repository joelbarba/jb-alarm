const Gpio = require('onoff').Gpio;
const door     = new Gpio(16, 'in', 'both',   { debounceTimeout: 10 });
const button   = new Gpio(4,  'in', 'rising', { debounceTimeout: 10 });
const greenLed = new Gpio(17, 'out');
const redLed   = new Gpio(18, 'out');

// Mocking
// const greenLed = { writeSync: (v) => console.log(`GREEN: ${!!v}`) };
// const redLed = { writeSync: (v) => console.log(`RED: ${!!v}`) };
// const door = (function() { let callback = () => {}; return { trigger: (v) => callback(false, v), watch: (fn) => callback = fn }; }());
// const button = (function() { let callback = () => {}; return { trigger: (v) => callback(false, v), watch: (fn) => callback = fn }; }());

console.log('main.js running...');

// setTimeout(_ => door.trigger(1), 5000);


let active = false; // whether the alarm is active
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
  addLog(isOpen);
  turnLeds();
});

process.on('SIGINT', _ => {
  activation(false);
  turnLedsOff();
  process.exit(0);
});


function activation(newValue = !active) {
  active = newValue;
  if (ledInt) { clearInterval(ledInt); }
  if (active) {
    console.log(getTime(), `ALARM activated`);
    greenLed.writeSync(1);
    ledInt = setInterval(_ => { greenLed.writeSync(1); setTimeout(_ => greenLed.writeSync(0), 70)}, 1500);
  } else {
    console.log(getTime(), `ALARM deactivated`);
  }
  turnLeds();
}

function turnLeds() {
  redLed.writeSync(isOpen ? 1 : 0); // Turn red on if door open
  if (!active) { greenLed.writeSync(0); }
}

function turnLedsOff() {
  redLed.writeSync(0);
  greenLed.writeSync(0);
}

// ---------------------------------------------------------------------------------------
// Firebase communication
// Adding docs to the doorlog collection for every change
const initializeApp = require('firebase/app').initializeApp;
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const firestore = require('firebase/firestore/lite');
const secrets = require('./secrets.js');

const app = initializeApp(secrets.firebaseConfig);  // Initialize Firebase
const db = firestore.getFirestore(app);

let doorLogsCol; // Ref to the doorlog collection
const auth = getAuth();
const fireBasePromise = signInWithEmailAndPassword(auth, secrets.userAuth.user, secrets.userAuth.pass).then((userCredential) => {
  console.log('Firebase: Logged in');
  doorLogsCol = firestore.collection(db, 'doorlog');
  isFirebaseReady = true;
}).catch((error) => console.error(`Login error: ${error.code} -> ${error.message}`));

async function addLog(isOpen) {
  await fireBasePromise;  
  const newDoc = {
    door: isOpen ? 'open' : 'closed',
    time: getTime(),
    alarm: active ? 'active' : 'inactive',
  };
  const docRef = await firestore.addDoc(doorLogsCol, newDoc);
  console.log(`New log added with ID = ${docRef.id}`);
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

const express = require('express');
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