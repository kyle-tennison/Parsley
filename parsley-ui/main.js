const { app, BrowserWindow,ipcMain } = require('electron')
const fs = require('fs')
const path = require("node:path")
const { exec } = require('child_process');

const CONFIG_FILE = '../storage/config.json'

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

function writeConfig(event, object) {
    fs.writeFile(CONFIG_FILE, JSON.stringify(object, null, 2), error => {
        if (error) throw error
      })
      console.log('writing:', object)
}

function runParse(){

  console.log("running parse")

  let command = "../parsley-inner/target/release/parsley-inner"

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve({
          stdout: "",
          stderr: error
        })
      }
      resolve({ stdout, stderr });
    });
  });




}

function openConfig(event){
    const command =
    process.platform === 'darwin' // macOS
      ? `open -a TextEdit "${CONFIG_FILE}"`
      : process.platform === 'win32' // Windows
      ? `start notepad "${CONFIG_FILE}"`
      : process.platform === 'linux' // Linux (GNOME)
      ? `gnome-open "${CONFIG_FILE}"`
      : null; // Unknown platform

  if (command) {
    exec(command, (error) => {
      if (error) {
        console.error(`Error opening file: ${error.message}`);
      } else {
        console.log(`Opened config file`);
      }
    });
  } else {
    console.error('Unsupported platform');
  }
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
        preload: path.join(__dirname, 'preload.js')
      }
  })

  win.loadFile(
    path.join(__dirname,'public/index.html' )
    )
}

app.whenReady().then(() => {

    ipcMain.handle("readConfig", readConfig)
    ipcMain.handle("writeConfig", writeConfig)
    ipcMain.handle("openConfig", openConfig)
    ipcMain.handle("runParse", runParse)

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})