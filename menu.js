import process from 'process';
import readline from 'readline';
import fs from 'fs';
import { cmd, sleep, move, print, line, repeat, color } from 'jb-node-lib';
import { red, green, yellow, blue, gray, grayDark, cyan, black, brown, white } from 'jb-node-lib';
import { run } from 'node:test';

readline.emitKeypressEvents(process.stdin);
if (process.stdin.setRawMode != null) { process.stdin.setRawMode(true); }

const keyboard = [];
process.stdin.on('keypress', (str, key) => {
  if (key.name === 'c' && key.ctrl) { exit(); }
  const keys = keyboard[keyboard.length - 1];
  if (key.name === 'up')     { return keys.keyUp    && keys.keyUp(); }
  if (key.name === 'down')   { return keys.keyDown  && keys.keyDown(); }
  if (key.name === 'return') { return keys.keyEnter && keys.keyEnter(); }
  if (key.name === 'space')  { return keys.keySpace && keys.keySpace(); }
  if (key.name === 'escape')  { return keys.keyEsc  && keys.keyEsc(); }
  if (keys[key.name]) { keys[key.name](); }
});
function exit() {
  // console.clear();
  move(0, 20);
  process.exit(0); 
}

const maxWidth = 100;
let pos = 1;
let ip = '192.168.1.132';
const LAST_IP_FILE = './lastIp.txt';
(function readLastIp() { try { ip = fs.readFileSync(LAST_IP_FILE); } catch(err) { fs.writeFileSync(LAST_IP_FILE, ip); } })();

const opts = [
  { code: 'scan',       title: `SCAN`,        com: () => `nmap -sn 192.168.1.0/24`,             desc: `Scan the local network to find the IP`, },
  { code: 'start',      title: `START`,       com: () => `node worker.js &`,                    desc: `Connect to Raspberry pi and run "node worker.js &"`,  },
  // { code: 'stop',       title: `STOP`,        com: () => `sh terminate.sh`,                     desc: `Connect to Raspberry pi and stop main.js background process`, },
  { code: 'pingPi',     title: `PING Pi`,     com: () => `ping ${ip}`,                          desc: `Ping Raspberry Pi local IP address, to check if it's on`, },
  { code: 'pingApp',    title: `PING App`,    com: () => `curl -X GET http://${ip}:4358/ping`,  desc: `Send a ping to test if main.js is running`, },
  { code: 'activate',   title: `ACTIVATE`,    com: () => `curl -X GET http://$ip:4358/activate`,    desc: `Send an http request to activate the alarm`, },
  { code: 'deactivate', title: `DEACTIVATE`,  com: () => `curl -X GET http://$ip:4358/deactivate`,  desc: `Send an http request to deactivate the alarm`, },
  { code: 'checkW',     title: `CHECK Wrk`,   com: () => `ssh -n -f pi@$${ip} "ps -ax | grep worker.js"`,  desc: `Check the PID of the worker process`, },
  { code: 'checkM',     title: `CHECK App`,   com: () => `ssh -n -f pi@$${ip} "ps -ax | grep main.js"`,  desc: `Check the PID of the main process`, },
  { code: 'update',     title: `UPDATE`,      com: () => `ssh -n -f pi@$ip "sh update_jbalarm.sh"`, desc: `Git Pull (master) the jb-alarm repo on the Raspberry Pi`, },
  { code: 'killAll',    title: `KILL xterm`,  com: () => `kill -9 PID`,                             desc: `Terminate all running xterms`, },
  { code: 'shutdown',   title: `SHUTDOWN`,    com: () => `ssh -n -f pi@$ip "sudo shutdown"`,        desc: `Send the shutdown command to the Raspberry Pi`, },
  { code: 'tail',       title: `TAIL -f`,     com: () => `tail -f ~/jbalarm.log`,                   desc: `Shows the logs of main.js in real time`, },
  { code: 'ssh',        title: `SSH Pi`,      com: () => `ssh pi@${ip}`,                            desc: `Ssh into the Raspberry Pi system`, },
  // { code: '',      title: ``,  com: () => ``,      desc: ``, },
  // ssh -n -f pi@192.168.1.132 "pgrep -f main.js"
];

console.clear();

// ssh -n -f pi@192.168.1.132 "tail -f ~/jbalarm.log"


printMenu();
keyboard.push({
  keyUp   : () => { if (pos > 1) { pos--; printMenu(); } },
  keyDown : () => { if (pos < opts.length) { pos++; printMenu(); } },
  keyEnter: () => { selectMainMenuOption(opts[pos-1]); },
});

function printMenu() {  
  print(`Select Option:`, 0, 0);
  print(`Raspberry Pi IP = ` + green(ip), 25, 0);
  for (let t = 0; t < opts.length; t++) {
    const opt = opts[t];
    let txt = line((t+1) + '.', 5, opt.title, 9, opt.com(), 25, opt.desc, 75);
    if (pos === t + 1) { txt = color(txt, 'white', 'bright', 'yellow'); }
    print(txt, 0, t + 2);
  }

  print(yellow(`--> `), 0, pos + 1);
}






const top = opts.length + 5;
async function selectMainMenuOption(opt) {
  for (let t = 0; t < 20; t++) { print(repeat(maxWidth, ' '), 0, opts.length + 5 + t); } // Clear screen
  print(yellow(opt.com()), 0, top);
  move(0, top + 1);
  keyboard.push({}); // Disable menu
  if (opt.code === 'start')       { await start(); }
  if (opt.code === 'stop')        { await terminateSH(); }
  if (opt.code === 'pingPi')      { await pingPi();  }
  if (opt.code === 'pingApp')     { await pingApp(); }
  if (opt.code === 'scan')        { await scanIPs(); }
  if (opt.code === 'checkW')      { await checkWorker(); }
  if (opt.code === 'checkM')      { await checkMain(); }
  if (opt.code === 'activate')    { await activation('activate'); }
  if (opt.code === 'deactivate')  { await activation('deactivate'); }
  if (opt.code === 'update')      { await updateSH(``); }
  if (opt.code === 'killAll')     { await killAllXTerm(); }
  if (opt.code === 'shutdown')    { await shutDown(); }
  if (opt.code === 'tail')        { await deatachXTerm('tail'); }
  if (opt.code === 'ssh')         { await deatachXTerm('ssh'); }
  keyboard.pop(); // Back to main menu keyboard
  printMenu();
}


async function start() {
  // deatachXTerm('start');
  // return runSSH(`cd ~/DEV/JB-ALARM && worker.js &`).then(res => {
  //   print(green(`worker.js executed  \n`) + res, 0, top + 3);
  // }).catch(err => print(err, 0, top + 3));
  print(`You should run this into the SSH:" node worker.js &  \n`, 0, top + 3);
  deatachXTerm('ssh');
}




async function pingPi() {
  const res = await cmd(`ping -c 1 ${ip} | head -2`);
  if (res.indexOf(`Destination Host Unreachable`) >= 0) {
    print(red(res), 0, top + 2);
  } else {
    print(green(res), 0, top + 2);
  }
  // PING 192.168.1.132 (192.168.1.132) 56(84) bytes of data.                                            
  // OK = 64 bytes from 192.168.1.132: icmp_seq=1 ttl=64 time=62.4 ms 
  // KO = From 192.168.1.137 icmp_seq=1 Destination Host Unreachable       
}

async function pingApp() {
  return cmd(`curl -s -X GET http://${ip}:4358/ping`).then(res => {
    print(green(res + ': The main.js process is running on the Raspberry Pi'), 0, top + 2);
  }).catch(err => {
    print(red(err), 0, top + 2);
  });
}

async function activation(verb) {
  return cmd(`curl -s -X GET http://${ip}:4358/${verb}`).then(res => {
    print('The Alarm is now: ' + green(res), 0, top + 2);
  }).catch(err => {
    print(red(err), 0, top + 2);
  });
}

async function scanIPs() {
  // print(yellow(`nmap -sn 192.168.1.0/24 ...`), 0, top);
  const res = await cmd(`nmap -sn 192.168.1.0/24 | grep "scan report"`);
  let ips = []; // Nmap scan report for 192.168.1.128
  res.split(`\n`).filter(r => !!r).forEach(r => {
    const ip = r.split('Nmap scan report for ')[1];
    if (ip && ip.split('.').every(n => n.length <= 3)) { ips.push(ip); }
  });

  let sel = 0;
  print(`The following IPs are detected on the local network. Select one (${cyan('Enter')})`, 0, top + 1);
  print(`or press ${cyan('t')} to test a curl -X GET http://$ip:4358/ping on the IP`, 0, top + 2);
  print(`or press ${cyan('s')} to try to ssh pi@$ip`, 0, top + 3);
  printIps();
  function printIps() {
    for (let t = 0; t < ips.length; t++) {
      let txt = ips[t];
      if (t === sel) { txt = color(ips[t], 'white', 'bright', 'yellow'); }
      print('     ' + txt, 2, top + 5 + t);
    }
    print('-->', 2, top + 5 + sel);
  }
  keyboard.push({
    keyUp   : () => { if (sel > 0)          { sel--; printIps(); } },
    keyDown : () => { if (sel < ips.length) { sel++; printIps(); } },
    keyEnter: () => {
      ip = ips[sel];
      fs.writeFileSync(LAST_IP_FILE, ip);
      print(` <-- Selected`, 25, top + 5 + sel);
      release();
    },
    ['t']: async () => {
      print(`curl -X GET http://${ips[sel]}:4358/ping`, 25, top + 5 + sel);
      cmd(`curl -s -X GET http://${ips[sel]}:4358/ping`).then(res => {
        print(green(res) + repeat(80, ' '), 25, top + 5 + sel);
        printIps();
      }).catch(err => {
        print(red(err), 25, top + 5 + sel);
        if (sel < ips.length - 1) { sel++ }
        printIps();
      });
    },
    ['s']: async () => {
      const prevPids = await cmd(`ps -A | grep "xterm" | tr -s ' ' | cut -d ' ' -f 2`).then(res => res.split(`\n`));
      const ip = ips[sel];
      print(`ssh pi@${ip}`, 25, top + 5 + sel);
      cmd(`xterm -geometry 170x60 -fa 'Monospace' -fs 11 -e "ssh pi@${ip}"`).then(() => {}).catch(() => {});    
      await sleep(500);
      const pids = await cmd(`ps -A | grep "xterm" | tr -s ' ' | cut -d ' ' -f 2`).then(res => res.split(`\n`));
      const pid = pids.find(p => prevPids.indexOf(p) < 0);
      if (pid) { // it worked
        // await cmd(`kill -9 ${pid}`);
        keyboard[0].keyEsc = () => cmd(`kill -9 ${pid}`);
        print(green('We can SSH to this IP       ') + repeat(80, ' '), 25, top + 5 + sel);
        printIps();
      } else { // wrong ip
        print(red('Could not SSH pi@ at this IP'), 25, top + 5 + sel);
        if (sel < ips.length - 1) { sel++ }
        printIps();
      }
    },
  });
  let release = () => {};
  await new Promise((resolve) => release = resolve);
  keyboard.pop(); // Back to main menu
}




// sshpass -p your_password ssh -n -f pi@192.168.1.132 "pgrep -f main.js"
function runSSH(command) { move(0, top + 1); return cmd(`ssh -n -f pi@${ip} "${command}"`); }


async function terminateSH() {
  return runSSH(`sh ~/DEV/JB-ALARM/terminate.sh`).then(res => {
    print(green(`terminate.sh executed  \n`) + res, 0, top + 3);
  }).catch(err => print(err, 0, top + 3));
}

async function updateSH() {
  return runSSH(`sh ~/DEV/JB-ALARM/update.sh`).then(res => {
    print(green(`update.sh executed  \n`) + res, 0, top + 3);
  }).catch(err => print(err, 0, top + 3));
}

async function checkMain() {
  await runSSH(`ps -ax | grep -v "grep" | grep main.js`).then(res => {
    if (res) { print(green(`The main.js process is running: ${res}`), 0, top + 3); }
    else { print(red(`The main.js is NOT running`), 0, top + 3);}    
  }).catch(err => print(red(err), 0, top + 3));
}

async function checkWorker() {
  await runSSH(`ps -ax | grep -v "grep" | grep worker.js`).then(res => {
    if (res) { print(green(`The worker.js process is running: ${res}`), 0, top + 3); }
    else { print(red(`The worker.js is NOT running`), 0, top + 3);}    
  }).catch(err => print(red(err), 0, top + 3));
}

async function shutDown() {
  return runSSH(`sudo shutdown`).then(res => {
    print(`Sending shutdown signal to Raspberry Pi. Wait a few and turn the power off`, 0, top + 3);
  }).catch(err => print(red(err), 0, top + 3));
}

async function killAllXTerm() {
  const pids = await cmd(`ps -A | grep "xterm" | tr -s ' ' | cut -d ' ' -f 2`).then(res => res.split(`\n`));
  for (let t = 0; t < pids.length; t++) {
    const pid = pids[t];
    if (pid) {
      cmd(`kill -9 ${pid}`)
      .then(res => print(green(`Terminal xterm terminated (PID: ${pid})`), 0, top + 5))
      .catch(err => print(red(err), 0, top + 5));
    }
  }
}


async function deatachXTerm(task) {
  const prevPids = await cmd(`ps -A | grep "xterm" | tr -s ' ' | cut -d ' ' -f 2`).then(res => res.split(`\n`));

  if (task === 'start') {
    // const command = `ssh -n -f pi@${ip} "sh ~/DEV/JB-ALARM/startup_monitor.sh"`;
    const command = `ssh -n -f pi@${ip} "cd ~/DEV/JB-ALARM && node worker.js &"`;
    cmd(`xterm -geometry 170x60 -hold -fa 'Monospace' -fs 11 -e '${command}'`).then(() => {}).catch(() => {});
  }
  if (task === 'tail') {
    const command = `ssh -n -f pi@${ip} "tail -f ~/jbalarm.log"`;
    cmd(`xterm -geometry 170x60 -hold -fa 'Monospace' -fs 11 -e '${command}'`).then(() => {}).catch(() => {});
  }
  if (task === 'ssh') {
    cmd(`xterm -geometry 170x60 -fa 'Monospace' -fs 11 -e "ssh pi@${ip}"`).then(() => {}).catch(() => {});
  }

  await sleep(500);
  const pids = await cmd(`ps -A | grep "xterm" | tr -s ' ' | cut -d ' ' -f 2`).then(res => res.split(`\n`));
  const pid = pids.find(p => prevPids.indexOf(p) < 0);
  print(`Running external xterm with PID = ${pid}`, 0, top + 3);
  print(`Press ${cyan('ESC')} to end the terminal with: kill -9 ${pid}`, 0, top + 4);
  keyboard[0].keyEsc = () => {
    cmd(`kill -9 ${pid}`)
    .then(res => print(green('Terminal xterm terminated'), 0, top + 5))
    .catch(err => print(red(err), 0, top + 5));
  };
}











