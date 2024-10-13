import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import * as firestore from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
const $ = (id) => document.getElementById(id); // shortcut


let isLoggedIn = false;
let logs = [];
let door = '';
let alarm = '';
let lastPing = getTime();

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
  // console.log('firebaseConfig ------>', firebaseConfig);
  
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

      // React on control document changes
      firestore.onSnapshot(firestore.doc(db, 'doorlog', '000CTRL_main_app'),     doc => { lastPing = doc.data()?.ping || getTime(); });
      firestore.onSnapshot(firestore.doc(db, 'doorlog', '000CTRL_door_status'),  doc => { door = doc.data()?.door || 'closed';     printDoorStatus(door);   });
      firestore.onSnapshot(firestore.doc(db, 'doorlog', '000CTRL_alarm_status'), doc => {
        const data = doc.data();
        alarm = data?.alarm || 'inactive';
        isActivateOnClose = !!data?.activate_on_close;
        printAlarmStatus(alarm); 
      });
   
      // React on logs change
      firestore.onSnapshot(firestore.collection(db, 'doorlog'), (snapshot) => updateState(snapshot), (err) => console.error(err));

      // Load initial values for the scheduler
      firestore.getDoc(firestore.doc(db, 'doorlog', '000CTRL_schedule')).then(snapshot => loadSchedule(snapshot));
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
  const snapshot = await firestore.getDocs(firestore.collection(db, 'doorlog'));
  updateState(snapshot);
}

function updateState(snapshot) {
  logs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).filter(doc => doc.id.slice(0, 8) !== '000CTRL_');
  logs.sort((a, b) => new Date(b.time) - new Date(a.time)); // order from latest (right now) to oldest (long ago)
  console.log('LOGS:', logs);
  printLogs();

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

function loadSchedule(snapshot) {
  const doc = snapshot.data();
  $('sch-ini-time').value = doc.activation_time;
  $('sch-end-time').value = doc.deactivation_time;
  $('sch-checkbox').checked = !!doc.enabled;
  $('sch-ini-time').style.background = doc.enabled ? 'white': '#555555';
  $('sch-end-time').style.background = doc.enabled ? 'white': '#555555';
  if (!doc.enabled) { $('schedule-info').innerHTML = `Schedule: OFF`; } 
  else { $('schedule-info').innerHTML = `Schedule: from ${doc.activation_time} to ${doc.deactivation_time}`; }
}

async function switchAlarm(newValue) {
  const isActive = alarm === 'active';
  if (newValue !== isActive) {
    alarm = newValue ? 'active' : 'inactive';
    const time = getTime();
    const newDoc = { door, time, alarm, change: 'alarm' };
    await firestore.setDoc(firestore.doc(db, 'doorlog', time), newDoc); // Add new log
    await firestore.setDoc(firestore.doc(db, 'doorlog', '000CTRL_alarm_status'), { time, alarm, activate_on_close: false }); // change status
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
  swapConfig(false);
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
  swapConfig(false);
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
    swapConfig(false);
  }
});

$('login-btn').addEventListener('click', ev => {
  const user = $('login-usr').value;
  const pass = $('login-pwd').value;
  login(user, pass);
});

$('info-line').addEventListener('click', () => swapConfig());
$('config-btn').addEventListener('click', () => swapConfig());
function swapConfig(isOpen = $('config-panel').style.transform !== 'translateX(0px)') {
  $('config-panel').style.transform = isLoggedIn && isOpen ? 'translateX(0px)': 'translateX(-110%)';
}

$('warning').addEventListener('click', ev => $('warning').style.display = 'none');
$('activate-btn').addEventListener('click',   ev => switchAlarm(true));
$('deactivate-btn').addEventListener('click', ev => switchAlarm(false));

let isActivateOnClose = false;
let actOnCloseBntDis = false;
$('activate-oc-btn').addEventListener('click', async ev => {
  if (actOnCloseBntDis) { return; }
  actOnCloseBntDis = true;
  console.log('isActivateOnClose = ', isActivateOnClose);
  isActivateOnClose = !isActivateOnClose;
  await firestore.updateDoc(firestore.doc(db, 'doorlog', '000CTRL_alarm_status'), { activate_on_close: !!isActivateOnClose });
  $('activate-oc-btn').innerHTML = `Activate on Close: ${isActivateOnClose ? 'ON' : 'OFF'}`;
  actOnCloseBntDis = false;
});




// Scheduler
$('sch-less30-ini-btn').addEventListener('click', () => $('sch-ini-time').value = incDecTime($('sch-ini-time').value, -30));
$('sch-plus30-ini-btn').addEventListener('click', () => $('sch-ini-time').value = incDecTime($('sch-ini-time').value,  30));
$('sch-less30-end-btn').addEventListener('click', () => $('sch-end-time').value = incDecTime($('sch-end-time').value, -30));
$('sch-plus30-end-btn').addEventListener('click', () => $('sch-end-time').value = incDecTime($('sch-end-time').value,  30));
function incDecTime(time = '00:00', delta = 30) {
  let mins = (parseInt(time.split(':')[0])*60) + parseInt(time.split(':')[1]);
  mins = (mins + delta) % 1440;
  if (mins < 0) { mins += 1440; }
  return (Math.floor(mins / 60) + ':').padStart(3, '0') + ((mins % 60) + '').padStart(2, '0');
}
$('sch-checkbox').addEventListener('input', ev =>  {
  $('sch-ini-time').style.background = ev.target.checked ? 'white': '#555555';
  $('sch-end-time').style.background = ev.target.checked ? 'white': '#555555';
});
$('sch-save-btn').addEventListener('click', ev =>  {
  const newSch = {
    activation_time   : $('sch-ini-time').value,
    deactivation_time : $('sch-end-time').value,
    enabled           : $('sch-checkbox').checked,
  };
  console.log('Saving new schedule', newSch);
  firestore.setDoc(firestore.doc(db, 'doorlog', '000CTRL_schedule'), newSch);
  if (!newSch.enabled) { $('schedule-info').innerHTML = `Schedule: OFF`; } 
  else { $('schedule-info').innerHTML = `Schedule: from ${newSch.activation_time} to ${newSch.deactivation_time}`; }
  swapConfig(false);
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
    // $('last-action').innerHTML += `<br/>at <span style="color: ${dateColor}">${curr.time}</span>`;
    $('last-action-ago').innerHTML = `<span style="color: ${dateColor}">${timeAgo(new Date(curr.time))}</span>`;
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
  $('activate-oc-btn').disabled = alarm === 'active';
  $('deactivate-btn').disabled = alarm === 'inactive';
  if (alarm === 'active') {
    $('alarm-status').innerHTML = `Alarm: <span style="color: ${activeColor}">ACTIVE</span>`;
  } else if (alarm === 'inactive') {
    $('alarm-status').innerHTML = `Alarm: INACTIVE`;
    $('activate-oc-btn').innerHTML = `Activate on Close: ${isActivateOnClose ? 'ON' : 'OFF'}`;
  } else {
    $('alarm-status').innerHTML = `Alarm: ???`;
  }
}

setInterval(() => {
  $('current-time').innerHTML = `Time: ${getTime().slice(11, -4)}`;
  if (logs.length) { 
    const atTimeAgo = timeAgo(new Date(logs[0].time));
    if (atTimeAgo !== $('last-action-ago').innerHTML) { $('last-action-ago').innerHTML = atTimeAgo; }
  }

  if ((new Date() - new Date(lastPing)) < 40*1000) {
    $('ping').innerHTML = 'Connected';
    $('ping').style.background = '#00ff39';
  } else {
    $('ping').innerHTML = `Disconnected<br\>${timeAgo(new Date(lastPing))}` ;
    $('ping').style.background = 'red';
  }

}, 500);

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

function timeAgo(time) {
  const now = new Date();
  const sec = Math.round((now - time) / 1000);
  if (sec <= 1) { return `${sec} second ago`; }
  if (sec < 60) { return `${sec} seconds ago`; }
  const min = Math.round((now - time) / 60000);
  if (min <= 1) { return `${min} minute ago`; }
  if (min < 60) { return `${min} minutes ago`; }
  const hour = Math.round((now - time) / 3600000);
  if (hour <= 1) { return `${hour} hour ago`; }
  if (hour < 60) { return `${hour} hours ago`; }
}


