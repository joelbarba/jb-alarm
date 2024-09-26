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
  console.log('firebaseConfig ------>', firebaseConfig);
  
  app = initializeApp(firebaseConfig);  // Initialize Firebase
  db = firestore.getFirestore(app);
  auth = getAuth();
  
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
      subscribeToLogs();
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
  fetchSnapshot(snapshot);
}
function subscribeToLogs() {
  const unsubscribe = firestore.onSnapshot(doorLogsCollection, (snapshot) => fetchSnapshot(snapshot), (err) => console.error(err));
}
function fetchSnapshot(snapshot) {
  logs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  logs.sort((a, b) => new Date(b.time) - new Date(a.time)); // order from latest (right now) to oldest (long ago)
  console.log('LOGS:', logs);
  printLogs();
}







// Delete -10 logs
$('clear-10-btn').addEventListener('click', async function() {
  $('clear-10-btn').disabled = true;
  await loadLogs();
  const oldLogs = logs.slice(10); // Preserve the latest 10 logs
  for (let t = 0; t < oldLogs.length; t++) {
    console.log('deleting log', oldLogs[t].id);
    await firestore.deleteDoc(firestore.doc(db, 'doorlog', oldLogs[t].id));
  }
  if (logs.length > 10) { $('clear-10-btn').disabled = false; }
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
  }
});




$('login-btn').addEventListener('click', ev => {
  const user = $('login-usr').value;
  const pass = $('login-pwd').value;
  login(user, pass);
});




$('activate-btn').addEventListener('click', ev => {
  printAlarmStatus(true);
});
$('deactivate-btn').addEventListener('click', ev => {
  printAlarmStatus(false);
});

function printLogs() {
  $('logs-list').innerHTML = logs.map(log => {
    if (log.alarm === 'active') { log.alarm = '_active_'; };
    return `${log.time} - (${log.alarm}) door: ${log.door}`;
  }).join(`<br/>`);

  if (logs.length) {
    const curr = logs[0];
    if (curr.change === 'door') {      
      $('last-action').innerHTML = `Last action: <b>${curr.door === 'open'? 'Opened' : 'Closed'}</b> <br/>at ${curr.time}`;
    } else {
      $('last-action').innerHTML = `Last action: <b>${curr.alarm === 'active'? 'Activated' : 'Deactivated'}</b> <br/>at ${curr.time}`;
    }
  } else {
    $('last-action').innerHTML = `Last action: -`;
  }
}
function printDoorStatus(isDoorOpen) {
  if (isDoorOpen) {
    $('door-status').innerHTML = `The door is: OPEN`;
    $('door-status').style.background = 'red';
  } else {
    $('door-status').innerHTML = `The door is: CLOSED`;
    $('door-status').style.background = '#00c100'; // green
  }
}
function printAlarmStatus(isAlarmActive) {
  $('activate-btn').disabled = isAlarmActive;
  $('deactivate-btn').disabled = !isAlarmActive;
  if (isAlarmActive) {
    $('alarm-status').innerHTML = `Alarm: ACTIVE`;
  } else {
    $('alarm-status').innerHTML = `Alarm: INACTIVE`;
  }
}