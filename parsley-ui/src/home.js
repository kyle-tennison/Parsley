// Parsley 2023
// Kyle Tennison

// Map checkbox blacklist map
const BLACKLIST_MAP = {
  coolant: "m5",
  restart: "replace",
  homing: "Z0",
};

// Update checkboxes to match json
async function preloadConfig() {
  let current_config = await readConfig();

  console.log(current_config);

  const coolant = document.getElementById("coolantCheckbox");
  const homing = document.getElementById("homingCheckbox");
  const restart = document.getElementById("restartCheckbox");

  if (
    current_config.blacklist.includes(BLACKLIST_MAP.coolant) !== coolant.checked
  ) {
    coolant.checked = !coolant.checked;
  }
  if (
    current_config.blacklist.includes(BLACKLIST_MAP.restart) !== restart.checked
  ) {
    restart.checked = !restart.checked;
  }
  if (
    current_config.blacklist.includes(BLACKLIST_MAP.homing) !== homing.checked
  ) {
    homing.checked = !homing.checked;
  }
}

// Updates blacklist configuration
async function updateConfig() {
  console.log("updating config");

  let current_config = await readConfig();

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

// Wrapper to read config with error handling
async function readConfig() {
  let config_response = await window.electron.readConfig();
  console.log(config_response);
  if (config_response.err !== undefined) {
    alert(`Error in Config Json: \n${config_response.err}`);
    await window.electron.openConfig();
  } else {
    return config_response.contents;
  }
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
  let current_config = await readConfig();
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
  // Wait a moment to let everything do its work (for windows)
  await new Promise((resolve) => setTimeout(resolve, 1000));
  document.getElementById("root-text").textContent =
    "Root: " + (await window.electron.getRoot());
}

// Setup event listeners
window.addEventListener("load", async () => {
  const form = document.getElementById("config-form");

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
    await readConfig(); // validate config
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

  await updateRoot();
  await preloadConfig();

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
