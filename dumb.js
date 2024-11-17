import process from 'process';
import readline from 'readline';
import fs from 'fs';

readline.emitKeypressEvents(process.stdin);
if (process.stdin.setRawMode != null) { process.stdin.setRawMode(true); }

console.log('dumb.js ====> This process is your pid ' + process.pid);
fs.writeFileSync('./main-pid.txt', process.pid + '');

const keyboard = [];
process.stdin.on('keypress', (str, key) => {
  if (key.name === 'c' && key.ctrl) { process.exit(0);  }
});