import process from 'process';
import readline from 'readline';
import fs from 'fs';
import { exec } from 'child_process';

readline.emitKeypressEvents(process.stdin);
if (process.stdin.setRawMode != null) { process.stdin.setRawMode(true); }

console.log('dumb.js ====> This process is your pid ' + process.pid);
// fs.writeFileSync('./main-pid.txt', process.pid + '');

process.stdin.on('keypress', (str, key) => {
  if (key.name === 'c' && key.ctrl) { process.exit(0);  }
});


let localIp = '???';
exec(`hostname -I`, (error, stdout, stderr) => {
  if (error)  { console.log('Error getting local IP'); return; }
  if (stderr) { console.log('Error getting local IP'); return; }
  localIp = stdout.trim();
  console.log('Your IP = ', localIp);
});