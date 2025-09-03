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


cmd(`hostname -I`).then((output) => {
  console.log('Your IP = ', output);
});

function cmd(command) {
  return new Promise((resolve, reject) => exec(command, (error, stdout, stderr) => {
    if (error) { reject(error.message); return; }
    if (stderr) { reject(stderr); return; }
    return resolve(stdout);
  }));
}