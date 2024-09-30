import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import * as firestore from 'firebase/firestore';
import * as secrets from './secrets.js';
import { exec } from 'child_process';

function run(command) {
  return new Promise((resolve, reject) => exec(command, (error, stdout, stderr) => {
    if (error) { console.log(`error: ${error.message}`); reject(error.message); return; }
    if (stderr) { console.log(`stderr: ${stderr}`); reject(stderr); return; }
    return resolve(stdout);
  }));
}

// run(`echo "hello"`).then(r => console.log(r));

/*
termux-torch [on | off]
termux-vibrate [options]                  -d duration (in ms), -f  force vibration even in silent mode
termux-toast [options] [text]             -g  set position of toast: [top, middle, or bottom] (default: middle)
termux-volume [stream] [volume]           Valid audio streams are: alarm, music, notification, ring, system, call.
termux-media-player [command] [args]      play <file> Plays specified media file (w/o file: Resumes playback if paused)
termux-tts-speak [-s stream] [text-to-speak] (stream = same as volume)
termux-notification [options]             -c/--content content     content to show in the notification
                                           --action action          action to execute when pressing the notification
                                           --sound                  play a sound with the notification
                                           --vibrate pattern        vibrate pattern, comma separated as in 500,1000,200
 */
// kill -9 19656

const app = initializeApp(secrets.firebaseConfig);  // Initialize Firebase
const db = firestore.getFirestore(app);
const auth = getAuth();
let doorLogsCol; // Ref to the doorlog collection
let unsubscribe;

signInWithEmailAndPassword(auth, secrets.userAuth.user, secrets.userAuth.pass).then((userCredential) => {
  console.log('Firebase: Logged in');
  doorLogsCol = firestore.collection(db, 'doorlog');
  if (unsubscribe) { unsubscribe(); }
  unsubscribe = firestore.onSnapshot(doorLogsCol, (snapshot) => updateState(snapshot), (err) => console.error(err));
}).catch((error) => console.error(`Login error: ${error.code} -> ${error.message}`));

async function updateState(snapshot) { // Update the status of the Alarm from Firebase
  const logs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  logs.sort((a, b) => new Date(b.time) - new Date(a.time)); // order from latest (right now) to oldest (long ago)
  console.log('logs =', logs[0]);

  await run(`termux-toast -g top "There is a new log"`);
  await run(`termux-vibrate -f -d 1000`);
  await run(`termux-volume music 3`);
  await run(`termux-media-player play taunt.wav`);
  await run(`termux-notification --sound --vibrate 500,1000,200 -c "something strange"`);
}