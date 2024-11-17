import process from 'node:process';
import readline from 'readline';
import fs from 'fs';
import cp from 'node:child_process';

function run(cmd) {
  return new Promise((resolve, reject) => cp.exec(cmd, (error, stdout, stderr) => {
    if (error) { console.log(`error: ${error.message}`); reject(error.message); return; }
    if (stderr) { console.log(`stderr: ${stderr}`); reject(stderr); return; }
    return resolve(stdout);
  }));
}

function checkRunning(pid) {
  try { return process.kill(pid, 0); }
  catch (error) { return error.code === 'EPERM'; }
}

function sleep(milliSeconds) {
  return new Promise(resolve => { setTimeout(resolve, milliSeconds); });
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

function log(str) {
  fs.writeFileSync('./worker.log', getTime() + ': ' + str + `\n`, { flag: 'a+' });
  console.log(getTime() + ': ' + str);
}

function launchMain() {
  const appName = 'main.js';
  log('LAUNCHING ---> ' + appName);
  // const child = cp.fork('dumb.js', ["--some", "arg"], options });
  const options = { slient : true, detached: true, stdio: [null, null, null] };
  const child = cp.spawn('node', [appName], options);
  child.unref();
  // child.disconnect(); 
}


fs.writeFileSync('./worker.log', '');


while (true) {
  const pid = await run(`cat main-pid.txt`);
  const isRunning = checkRunning(pid);
  log('main-pid.txt (main.js): PID = ' + pid + '  is running = ' + isRunning);
  if (!isRunning) {
    launchMain();
  }
  await sleep(2000);
}