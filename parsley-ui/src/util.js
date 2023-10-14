const fs = window.require('fs')
// const path = window.require('path')
const { execSync } = require('child_process');
const os = require('os')

const CONFIG_FILE = '../storage/config.json'

const BLACKLIST_MAP = {
  coolant: 'm5',
  spindleStart: 'replace',
  homing: 'Z0'
}

function writeConfig(object) {
  fs.writeFile(CONFIG_FILE, JSON.stringify(object, null, 2), error => {
    if (error) throw error
  })
  console.log('writing:', object)
}

function readConfig() {
  try {
    const fileData = fs.readFileSync(CONFIG_FILE, 'utf8')
    const jsonData = JSON.parse(fileData)
    console.log('read config as:', jsonData)
    return jsonData
  } catch (error) {
    console.error(`Error reading Config Json: ${error.message}`)
  }
}

function openJson(){
    // console.log(execSync('ls'));
    const { exec } = require('child_process');
    console.log("exec:", exec)
    return
exec('ls | grep js', (err, stdout, stderr) => {
  if (err) {
    //some err occurred
    console.error(err)
  } else {
   // the *entire* stdout and stderr (buffered)
   console.log(`stdout: ${stdout}`);
   console.log(`stderr: ${stderr}`);
  }
});
}

module.exports = {
  BLACKLIST_MAP: BLACKLIST_MAP,
  writeConfig: writeConfig,
  readConfig: readConfig,
  openJson: openJson,
}
