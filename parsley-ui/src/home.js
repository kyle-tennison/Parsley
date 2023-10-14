// Parsley 2023
// Kyle Tennison

// Map checkbox blacklist map
const BLACKLIST_MAP = {
  coolant: "m5",
  restart: "replace",
  homing: "Z0",
};

// Updates blacklist configuration
async function updateConfig() {
  console.log("updating config");

  let current_config = await window.electron.readConfig();
  if (current_config === undefined) {
    await window.electron.openConfig();
    alert("Error in config json");
  }

  const coolant = document.getElementById("coolantCheckbox");
  const homing = document.getElementById("homingCheckbox");
  const restart = document.getElementById("restartCheckbox");

  let selections = {
    coolant: coolant.checked,
    restart: restart.checked,
    homing: homing.checked,
  };

  let new_blacklist = [];

  // Update settings for all the default keys
  for (const key in selections) {
    let blocked = selections[key];
    if (blocked) {
      // Add the blocked key
      new_blacklist.push(BLACKLIST_MAP[key]);
    }
  }

  // Add back the custom keys
  for (const key in current_config.blacklist) {
    let item = current_config.blacklist[key];
    if (!Object.values(BLACKLIST_MAP).includes(item)) {
      new_blacklist.push(item);
    }
  }

  current_config.blacklist = new_blacklist;
  await window.electron.writeConfig(current_config);
}

// Scrolls console to bottom
async function scrollConsole() {
  let console = document.getElementById("consoleText");

  // console.scrollTop = console.scrollHeight
  console.scrollIntoView({ behavior: "smooth", block: "end" });
}

// Appends line to blacklist
async function appendLine(line) {
  if (line === "") {
    console.log("line is empty, skipping");
    return;
  }
  let current_config = await window.electron.readConfig();
  let blacklist = current_config.blacklist;

  if (blacklist.includes(line)) {
    console.warn(`Skipping add '${line}'. Already in blacklist.`);
    return;
  }

  blacklist.push(line);
  current_config.blacklist = blacklist;
  await window.electron.writeConfig(current_config);
}

// Adds custom line to blacklist
async function customLineSubmit() {
  let button = document.getElementById("submitCustomBlock");
  let textbox = document.getElementById("customBlock");

  let line = textbox.value.trim();

  if (line === "") {
    console.log("line empty. ignoring");
    return;
  }

  textbox.value = "";

  await appendLine(line);
}

// Updates parse root
async function updateRoot() {
  // Set root text
  document.getElementById("root-text").textContent =
    "Root: " + (await window.electron.getRoot());
}

// Setup event listeners
window.addEventListener("load", async () => {
  const form = document.getElementById("config-form");

  // Read config from json and update buttons to match status
  let config = await window.electron.readConfig();

  if (config === undefined) {
    await window.electron.openConfig();
    alert("Error in config json");
  }

  const ID_MAP = {
    coolantCheckbox: "m5",
    restartCheckbox: "replace",
    homingCheckbox: "Z0",
  };

  for (const id in ID_MAP) {
    let contents = ID_MAP[id];
    let element = document.getElementById(id);

    if (config.blacklist.includes(contents)) {
      element.checked = true;
    }

    // Assign listeners for all checkboxes
    element.addEventListener("change", updateConfig);
  }

  // Listener for custom line
  document
    .getElementById("submitCustomBlock")
    .addEventListener("click", async () => {
      await customLineSubmit();
    });

  // Listen for open json
  document.getElementById("modifyJson").addEventListener("click", async () => {
    await window.electron.openConfig();
  });

  // Listen for set root
  document.getElementById("modifyRoot").addEventListener("click", async () => {
    await window.electron.setRoot();
    await updateRoot();
  });

  // Listen for parse start
  document.getElementById("start-parse").addEventListener("click", async () => {
    let button = document.getElementById("start-parse");
    button.disabled = true;
    document.getElementById("consoleText").textContent = "";
    await window.electron.runParse();
  });

  // Listen for header controls
  document.getElementById("exit").addEventListener("click", () => {
    window.electron.exit();
  });
  document.getElementById("minimize").addEventListener("click", () => {
    window.electron.minimize();
  });

  updateRoot();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
  });
});


// ------------------------------
//     Console Listeners
// ------------------------------
window.electron.on("parse:stdout", (event, data) => {
  let consoleText = document.getElementById("consoleText");
  let newContent = "";
  data = data.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  for (i in data.split("\n")) {
    let line = data.split("\n")[i];
    if (line.startsWith("info:")) {
      line = `<strong>${line}<strong/>`;
    } else if (line.startsWith("error:")) {
      line = `<em>${line}<em/>`;
    }
    newContent += `${line}<br>`;
  }

  consoleText.innerHTML += newContent;
  scrollConsole();
});

window.electron.on("parse:stderr", (event, data) => {
  console.error(data);
  let consoleText = document.getElementById("consoleText");
  let newContent = "";
  data = data.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  for (i in data.split("\n")) {
    let line = data.split("\n")[i];
    newContent += `${line}<br>`;
  }

  newContent = `<em>${newContent}<em>`;
  consoleText.innerHTML += newContent;
  scrollConsole();
});

window.electron.on("parse:exit", (event, code) => {
  let button = document.getElementById("start-parse");
  button.disabled = false;
  console.log(`Command exited with code ${code}`);
});
