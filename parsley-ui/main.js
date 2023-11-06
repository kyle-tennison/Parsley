// Parsley 2023
// Kyle Tennison

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

class Parsley {
  constructor() {
    this.load_environment(); // Determine resource dir and rust path

    // Configure window Load
    app.whenReady().then(() => {
      // Map IPC handlers to methods
      ipcMain.handle("readConfig", this.readConfig.bind(this));
      ipcMain.handle("writeConfig", this.writeConfig.bind(this));
      ipcMain.handle("openConfig", this.openConfig.bind(this));
      ipcMain.handle("runParse", this.runParse.bind(this));
      ipcMain.handle("getRoot", this.getRoot.bind(this));
      ipcMain.handle("setRoot", this.setRoot.bind(this));
      ipcMain.handle("exit", this.exit.bind(this));
      ipcMain.handle("minimize", this.minimize.bind(this));
      ipcMain.handle("openExternal", this.openExternal.bind(this));

      this.createWindow(); // Create primary window

      // Create new window on open trigger (if none already exist)
      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow();
        }
      });

      // Exit app on windows when window is closed
      app.on("window-all-closed", () => {
        if (process.platform !== "darwin") {
          app.quit();
        }
      });
    });
  }

  /**
   * Determines the source of execution (packaged or dev), and loads
   * important paths as class members
   */
  load_environment() {
    var isDev = process.env.APP_DEV
      ? process.env.APP_DEV.trim() == "true"
      : false;

    if (isDev) {
      console.log("Running in development mode");
      this.RESOURCE_DIR = path.resolve("../dev-resource/");
      this.INNER_PATH = path.resolve(
        path.join(__dirname, "../parsley-inner/target/release/parsley-inner"),
      );
    } else {
      this.RESOURCE_DIR = path.resolve(path.join(__dirname, ".."));
      this.INNER_PATH = path.join(RESOURCE_DIR, "parsley-inner");
      console.log("Running in production mode");
    }
  }

  /**
   * Reads config.json into a js object
   *
   * @returns Deserialized JSON object
   */
  readConfig() {
    try {
      const fileData = fs.readFileSync(
        path.resolve(path.join(this.RESOURCE_DIR, "config.json")),
        "utf8",
      );
      const jsonData = JSON.parse(fileData);
      return { contents: jsonData };
    } catch (error) {
      console.error(`Error reading Config Json: ${error.message}`);
      return { err: error.message };
    }
  }

  /**
   * Serializes a js object into JSON format; overwrites config.json
   *
   * @param {event} _e Unused - byproduct of IPC handler
   * @param {object} object The object to serialize
   */
  writeConfig(_e, object) {
    fs.writeFile(
      path.join(this.RESOURCE_DIR, "config.json"),
      JSON.stringify(object, null, 2),
      (error) => {
        if (error) throw error;
      },
    );

    // When we write to the config we need to clear the cache
    let cache = path.join(this.RESOURCE_DIR, "cache.txt");
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

  /**
   * Executes parse in Rust asynchronously
   */
  async runParse() {
    let command = `${this.INNER_PATH}`;
    let args = [this.getRoot(), this.RESOURCE_DIR];

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

    this.rustProcess = spawn(command, args, { shell: true });

    window.webContents.send("parse:stdout", `$ ${command} ${args.join(" ")}`);

    this.rustProcess.stdout.on("data", (data) => {
      let stdout = data.toString();
      console.log("stdout:", stdout);
      if (window.isDestroyed()) return;
      window.webContents.send("parse:stdout", stdout);
    });

    this.rustProcess.stderr.on("data", (data) => {
      if (window.isDestroyed()) return;
      window.webContents.send("parse:stderr", data.toString());
    });

    this.rustProcess.on("close", (code) => {
      if (window.isDestroyed()) return;
      window.webContents.send("parse:exit", code);
    });
  }

  /**
   * Opens OS dialogue to prompt for root directory
   */
  async setRoot() {
    let win = BrowserWindow.getAllWindows()[0];
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ["openDirectory"],
    });
    if (canceled) {
      return;
    } else {
      let root = filePaths[0];
      let config = this.readConfig().contents;
      config.root = root;
      this.writeConfig(null, config);
    }
  }

  /**
   * Fetches user-defined root from config.json; defaults to home directory
   * if undefined
   *
   * @returns {String} Root Path
   */
  getRoot() {
    console.log(this);
    const root = this.readConfig().contents.root;
    if (root === undefined) {
      return process.platform === "darwin" ? "$HOME" : "%UserProfile%";
    }
    return root;
  }

  /**
   * Opens config.json with OS native texteditor
   *
   * @param {event} _e unused - byproduct of IPC handler
   */
  openConfig(_e) {
    console.log(this);
    const command =
      process.platform === "darwin" // MacOS
        ? `open -a TextEdit "${path.join(this.RESOURCE_DIR, "config.json")}"`
        : process.platform === "win32" // Windows
        ? `start notepad "${path.join(this.RESOURCE_DIR, "config.json")}"`
        : process.platform === "linux" // Linux (GNOME)
        ? `gnome-open "${path.join(this.RESOURCE_DIR, "config.json")}"`
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
  /**
   * Exits the app
   *
   * @param {boolean} hard For MacOS only; hard exit will close app entirely – soft closes window
   */
  exit(hard = false) {
    this.closeDuplicateWindows();
    const win = BrowserWindow.getAllWindows()[0];
    if (process.platform !== "darwin" || hard) {
      app.quit();
    }
    win.close();
  }

  /**
   * Opens a web URL with OS default browser
   *
   * @param {event} _e Unused - byproduct of IPC handler
   * @param {string} link The URL to open
   */
  async openExternal(e, link) {
    console.log("Opening external link: ", link);
    shell.openExternal(link);
  }

  /**
   * Minimizes the application window
   */
  minimize() {
    this.closeDuplicateWindows();
    const win = BrowserWindow.getAllWindows()[0];
    win.minimize();
  }

  /**
   * Closes any duplicate windows
   */
  closeDuplicateWindows() {
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

  /**
   * Creates the primary parsley window
   *
   * @returns {BrowserWindow} The main window
   */
  createWindow() {
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
  }
}

// Run everything
new Parsley();
