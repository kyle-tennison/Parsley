// Parsley 2023
// Kyle Tennison

// For build
if (require("electron-squirrel-startup")) app.quit();

const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  nativeImage,
  shell,
} = require("electron");
const fs = require("fs");
const path = require("node:path");
const { exec, spawn } = require("child_process");

let RESOURCE_DIR;
let INNER_PATH;

var isDev = process.env.APP_DEV ? process.env.APP_DEV.trim() == "true" : false;

if (isDev) {
  console.log("Running in development mode");
  RESOURCE_DIR = path.resolve("../dev-resource/");
  INNER_PATH = path.resolve(
    path.join(__dirname, "../parsley-inner/target/release/parsley-inner"),
  );
} else {
  RESOURCE_DIR = path.resolve(path.join(__dirname, ".."));
  INNER_PATH = path.join(RESOURCE_DIR, "parsley-inner");
  console.log("Running in production mode");
}

// Load config json as object
function readConfig() {
  try {
    const fileData = fs.readFileSync(
      path.resolve(path.join(RESOURCE_DIR, "config.json")),
      "utf8",
    );
    const jsonData = JSON.parse(fileData);
    return { contents: jsonData };
  } catch (error) {
    console.error(`Error reading Config Json: ${error.message}`);
    return { err: error.message };
  }
}

// Write to config json
function writeConfig(event, object) {
  fs.writeFile(
    path.join(RESOURCE_DIR, "config.json"),
    JSON.stringify(object, null, 2),
    (error) => {
      if (error) throw error;
    },
  );

  // When we write to the config we need to clear the cache
  let cache = path.join(RESOURCE_DIR, "cache.txt");
  fs.open(cache, "w", (err, fileDescriptor) => {
    if (err) {
      console("Error opening the file:", err);
      throw err;
    }

    fs.ftruncate(fileDescriptor, 0, (truncateErr) => {
      if (truncateErr) {
        console.error("Error truncating the file:", truncateErr);
      } else {
        console.log("File contents cleared successfully.");
      }

      // Close the file descriptor.
      fs.close(fileDescriptor, (closeErr) => {
        if (closeErr) {
          console.error("Error closing the file:", closeErr);
          throw closeErr;
        }
      });
    });
  });
}

// Run parse in rust
async function runParse() {
  let command = `${INNER_PATH}`;

  let args = [await getRoot(), RESOURCE_DIR];

  if (process.platform === "win32") {
    command = `"${command}.exe"`;
    command = command.replace("\\", "/");
  } else {
    command = `"${command}"`;
  }

  for (let i in args) {
    args[i] = `"${args[i]}"`.replace("\\", "/");
  }

  console.log("Running command: ", command, args);
  const window = BrowserWindow.getAllWindows()[0];

  const childProcess = spawn(command, args, { shell: true });

  window.webContents.send("parse:stdout", `$ ${command} ${args.join(" ")}`);

  childProcess.stdout.on("data", (data) => {
    let stdout = data.toString();
    console.log("stdout:", stdout);
    if (window.isDestroyed()) return;
    window.webContents.send("parse:stdout", stdout);
  });

  childProcess.stderr.on("data", (data) => {
    if (window.isDestroyed()) return;
    window.webContents.send("parse:stderr", data.toString());
  });

  childProcess.on("close", (code) => {
    if (window.isDestroyed()) return;
    window.webContents.send("parse:exit", code);
  });

  return;

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve({
          stdout: stdout,
          stderr: error,
        });
      }
      resolve({ stdout, stderr });
    });
  });
}

// Set root in json
async function setRoot() {
  let win = BrowserWindow.getAllWindows()[0];
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"],
  });
  if (canceled) {
    return;
  } else {
    let root = filePaths[0];

    console.log("setting root to", root);

    let config = readConfig().contents;
    config.root = root;
    writeConfig(null, config);
  }
}

// Gets root from json
async function getRoot() {
  const root = readConfig().contents.root;
  if (root === undefined) {
    return process.platform === "darwin" ? "$HOME" : "%UserProfile%";
  }
  return root;
}

// Open config with native texteditor
function openConfig(event) {
  const command =
    process.platform === "darwin" // macOS
      ? `open -a TextEdit "${path.join(RESOURCE_DIR, "config.json")}"`
      : process.platform === "win32" // Windows
      ? `start notepad "${path.join(RESOURCE_DIR, "config.json")}"`
      : process.platform === "linux" // Linux (GNOME)
      ? `gnome-open "${path.join(RESOURCE_DIR, "config.json")}"`
      : null; // Unknown platform

  if (command) {
    exec(command, (error) => {
      if (error) {
        console.error(`Error opening file: ${error.message}`);
      } else {
        console.log("Opened config file");
      }
    });
  } else {
    console.error("Unsupported platform");
  }
}

// Exit app
function exit(hard) {
  console.log("exit app");
  closeDuplicateWindows();
  const win = BrowserWindow.getAllWindows()[0];
  if (process.platform !== "darwin" || hard) {
    app.quit();
  }
  win.close();
}

// Open an external link
async function openExternal(event, link) {
  console.log("Opening external link:", link);
  shell.openExternal(link);
}

// Minimize window
function minimize() {
  console.log("minimize window");
  closeDuplicateWindows();
  const win = BrowserWindow.getAllWindows()[0];
  win.minimize();
}

// Force only one window open
function closeDuplicateWindows() {
  if (BrowserWindow.getAllWindows().length > 1) {
    let preserved_win = false;
    for (let i in BrowserWindow.getAllWindows()) {
      if (!preserved_win) {
        continue; // We save one window
      } else {
        i.close();
      }
    }
  }
}

// Creates main window
const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 525,
    maxWidth: 900,
    minHeight: 350,
    maxHeight: 750,
    frame: false,
    closable: true,
    minimizable: true,
    icon: path.join(__dirname, "static/assets/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile(path.join(__dirname, "static/index.html"));

  if (process.platform === "darwin") {
    const image = nativeImage.createFromPath("build-resources/icon.png");
    app.dock.setIcon(image);
  }

  return win;
};

app.whenReady().then(() => {
  // Setup ipc handlers
  ipcMain.handle("readConfig", readConfig);
  ipcMain.handle("writeConfig", writeConfig);
  ipcMain.handle("openConfig", openConfig);
  ipcMain.handle("runParse", runParse);
  ipcMain.handle("getRoot", getRoot);
  ipcMain.handle("setRoot", setRoot);
  ipcMain.handle("exit", exit);
  ipcMain.handle("minimize", minimize);
  ipcMain.handle("openExternal", openExternal);

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
