import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import * as firestore from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';


let doorLogsCollection; // Ref to the doorlog collection
let isLoggedIn = false;
let logs = [];
const $ = (id) => document.getElementById(id); // shortcut

let app;  // Firebase App
let db;   // Firebase DB
let auth; // Firebase Auth
let unsubscribe;

if (localStorage.apiKey) {
  initFirebase();
} else {
  $('api-panel').style.display = 'block';
  $('api-key-btn').addEventListener('click', () => {
    $('api-panel').style.display = 'none';
    localStorage.apiKey = $('api-key').value;
    initFirebase();
  });
}

function initFirebase() {
  const firebaseConfig = {
    apiKey: localStorage.apiKey,
    authDomain: "jb-notes-ef76a.firebaseapp.com",
    projectId: "jb-notes-ef76a",
    storageBucket: "jb-notes-ef76a.appspot.com",
    messagingSenderId: "537223610796",
    appId: "1:537223610796:web:1f552e80d7dd309c65fa09",
    measurementId: "G-CK60M4SK5J"
  };
  // console.log('firebaseConfig ------>', firebaseConfig);
  
  app = initializeApp(firebaseConfig);  // Initialize Firebase
  db = firestore.getFirestore(app);
  auth = getAuth();

  let unsubscribe;
  
  // Detect if there is a current session alive
  onAuthStateChanged(auth, (user) => {
    isLoggedIn = !!user;
    $('login-panel').style.display = isLoggedIn ? 'none' : 'block';
    $('main-panel').style.display = isLoggedIn ? 'block' : 'none';
    $('config-btn').style.display = isLoggedIn ? 'block' : 'none';
    if (user) {
      console.log('Auth Session Detected', user);
      doorLogsCollection = firestore.collection(db, 'doorlog');
      // loadLogs(); // the subscription triggers the first load already
      if (unsubscribe) { unsubscribe(); }
      unsubscribe = firestore.onSnapshot(doorLogsCollection, (snapshot) => updateState(snapshot), (err) => console.error(err));
    } else {
      console.log('No Auth Session');
    }
  });
}

function login(username, password) {
  signInWithEmailAndPassword(auth, username, password).then(async (userCredential) => {
    console.log('Firebase: Logged in', userCredential);
  }).catch((error) => console.error(`Login error: ${error.code} -> ${error.message}`));
}

async function loadLogs() {
  const snapshot = await firestore.getDocs(doorLogsCollection);
  updateState(snapshot);
}

function updateState(snapshot) {
  logs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  logs.sort((a, b) => new Date(b.time) - new Date(a.time)); // order from latest (right now) to oldest (long ago)
  console.log('LOGS:', logs);
  console.log('Current Status =', logs[0]);
  printLogs();
  printDoorStatus(logs[0]?.door);
  printAlarmStatus(logs[0]?.alarm);
  // if (logs[0]?.alarm === 'active' && logs[0]?.door === 'open') {
  //   $('warning').style.display = 'block';
  //   console.warn(new Date(), 'ALARM RINGING - The door was open with the alarm active!!!');
  // }
  if (logs[0]?.alarm === 'inactive') { $('warning').style.display = 'none'; }
  
  // If the alarm is active, and while it was still active, there was a moment when the door opened: RING
  if (logs[0]?.alarm === 'active') {
    for (let t = 0; t < logs.length; t++) {
      if (logs[t]?.alarm === 'inactive') { break; }
      if (logs[t]?.door === 'open') {
        $('warning').style.display = 'block';
        console.warn(new Date(), 'ALARM RINGING - The door was open with the alarm active!!!');
      }
    }
  }
}

async function switchAlarm(newValue) {
  const isActive = logs[0]?.alarm === 'active';
  if (newValue !== isActive || !logs.length) {
    const alarm = newValue ? 'active' : 'inactive';
    const newDoc = {
      door: logs[0]?.door || '???',
      time: getTime(),
      alarm,
      change: 'alarm'
    };
    await firestore.addDoc(doorLogsCollection, newDoc);
    console.log('Alarm changed to: ', alarm);
    printAlarmStatus(alarm);
  }  
}







// Delete -10 logs
$('clear-1-btn').addEventListener('click', async function() {
  $('clear-1-btn').disabled = true;
  await loadLogs();
  const oldLogs = logs.slice(1); // Preserve the latest log
  for (let t = 0; t < oldLogs.length; t++) {
    console.log('deleting log', oldLogs[t].id);
    await firestore.deleteDoc(firestore.doc(db, 'doorlog', oldLogs[t].id));
  }
  $('clear-1-btn').disabled = false;
});

// Delete -10 logs
$('clear-10-btn').addEventListener('click', async function() {
  $('clear-10-btn').disabled = true;
  await loadLogs();
  const oldLogs = logs.slice(10); // Preserve the latest 10 logs
  for (let t = 0; t < oldLogs.length; t++) {
    console.log('deleting log', oldLogs[t].id);
    await firestore.deleteDoc(firestore.doc(db, 'doorlog', oldLogs[t].id));
  }
  $('clear-10-btn').disabled = false;
});

// Delete All logs
$('clear-all-btn').addEventListener('click', async function() {
  if (confirm(`Are you sure you want to delete all logs?`)) {
    $('clear-all-btn').disabled = true;
    await loadLogs();
    const logsCopy = [...logs];
    for (let t = 0; t < logsCopy.length; t++) {
      console.log('deleting log', logsCopy[t].id);
      await firestore.deleteDoc(firestore.doc(db, 'doorlog', logsCopy[t].id));
    }
    $('clear-all-btn').disabled = false;
  }
});

$('login-btn').addEventListener('click', ev => {
  const user = $('login-usr').value;
  const pass = $('login-pwd').value;
  login(user, pass);
});

$('config-btn').addEventListener('click', () => {
  const isHidden = $('config-panel').style.display === 'none';
  $('config-panel').style.display = isLoggedIn && isHidden ? 'block' : 'none';
})

$('activate-btn').addEventListener('click',   ev => switchAlarm(true));
$('deactivate-btn').addEventListener('click', ev => switchAlarm(false));

$('warning').addEventListener('click', ev => {
  $('warning').style.display = 'none'; 
});


const openColor = 'red';        // red
const closedColor = '#00c100';  // green
const activeColor = 'yellow';   // yellow
const inactiveColor = 'gray'; // gray
const dateColor = '#00adad';    // blue

function printLogs() {
  $('logs-list').innerHTML = logs.map(log => {
    const alarm = log.alarm === 'active' ? `<span style="color: ${activeColor}">_active_</span>` : 'inactive';
    if (log.change === 'door') {
      let colSpan = `<span style="color: ${log.door === 'open' ? 'white' : closedColor}">`;
      const ring = log.door === 'open' && log.alarm === 'active' ? ' <---- RING!' : ''
      if (ring) { colSpan = `<span style="color: ${openColor}">`; }
      return `<span style="color: ${dateColor}">${log.time}</span> - ${colSpan}(${alarm}) door: ${log.door}${ring}</span>`;
    } else {
      return `<span style="color: ${dateColor}">${log.time}</span> - (${alarm}) <span style="color: gray">door: ${log.door}</span>`;
    }
  }).join(`<br/>`);

  $('last-action').innerHTML = `Last action: `;
  if (logs.length) {
    const curr = logs[0];
    if (curr.change === 'door') {
      if (curr.door === 'open')   { $('last-action').innerHTML += `<span style="color: ${openColor};">Opened</span>`; }
      if (curr.door === 'closed') { $('last-action').innerHTML += `<span style="color: ${closedColor};">Closed</span>`; }
    } else {
      if (curr.alarm === 'active')   { $('last-action').innerHTML += `<span style="color: ${activeColor};">Activated</span>`; }
      if (curr.alarm === 'inactive') { $('last-action').innerHTML += `<span style="color: ${inactiveColor};">Deactivated</span>`; }
    }
    $('last-action').innerHTML += `<br/>at <span style="color: ${dateColor}">${curr.time}</span>`;
  }
}
function printDoorStatus(door) {
  if (door === 'open') {
    $('door-status').innerHTML = `The door is: OPEN`;
    $('door-status').style.background = openColor;
  } else if (door === 'closed') {
    $('door-status').innerHTML = `The door is: CLOSED`;
    $('door-status').style.background = closedColor;
  } else {
    $('door-status').innerHTML = `The door is: ???`;
    $('door-status').style.background = 'black';
  }
}
function printAlarmStatus(alarm) {
  $('activate-btn').disabled = alarm === 'active';
  $('deactivate-btn').disabled = alarm === 'inactive';
  if (alarm === 'active') {
    $('alarm-status').innerHTML = `Alarm: <span style="color: ${activeColor}">ACTIVE</span>`;
  } else if (alarm === 'inactive') {
    $('alarm-status').innerHTML = `Alarm: INACTIVE`;
  } else {
    $('alarm-status').innerHTML = `Alarm: ???`;
  }
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