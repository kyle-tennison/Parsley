console.log("hello world")

const {app, BrowserWindow} = require("electron");
require("@electron/remote/main").initialize()

const isDev = require('electron-is-dev')

function createWindow(){
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences:{
            enableRemoteModule: true
        }
    })

    win.loadURL(
        isDev
          ? 'http://localhost:3000'
          : `file://${path.join(__dirname, '../build/index.html')}`
      )
}

app.on("ready", createWindow)

app.on('windows-all-closed', () => {
    // macos doesn't actually close apps
    if (process.platform !== "darwin"){
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length() === 0) {
        createWindow()
    }
})