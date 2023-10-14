

const BLACKLIST_MAP = {
    coolant: 'm5',
    restart: 'replace',
    homing: 'Z0'
  }

async function updateConfig() {
    console.log("updating config")

    let current_config = await window.electron.readConfig();
    if (current_config === undefined){
        await window.electron.openConfig();
        alert("Error in config json")
    }

    const coolant = document.getElementById("coolantCheckbox");
    const homing = document.getElementById("homingCheckbox");
    const restart = document.getElementById("restartCheckbox");

    let selections = {
        coolant: coolant.checked,
        restart: restart.checked,
        homing: homing.checked
      }

    let new_blacklist = []

    // Update settings for all the default keys
    for (const key in selections) {
        let blocked = selections[key]
        if (blocked) {
          // Add the blocked key
          new_blacklist.push(BLACKLIST_MAP[key])
        }
      }
  
    // Add back the custom keys
    for (const key in current_config.blacklist) {
        let item = current_config.blacklist[key]
        if (!Object.values(BLACKLIST_MAP).includes(item)) {
          new_blacklist.push(item)
        }
      }

    current_config.blacklist = new_blacklist
    await window.electron.writeConfig(current_config)

}

async function appendLine(line) {
    if (line === ""){
        console.log("line is empty, skipping")
        return
    }
    let current_config = await window.electron.readConfig()
    console.log('pre-modify is:', current_config.blacklist)
    let blacklist = current_config.blacklist

    if (blacklist.includes(line)) {
      console.warn(`Skipping add '${line}'. Already in blacklist.`)
      return
    }

    blacklist.push(line)
    current_config.blacklist = blacklist
    await window.electron.writeConfig(current_config)
  }


async function customLineSubmit(){
    let button = document.getElementById("submitCustomBlock");
    let textbox = document.getElementById("customBlock")

    let line = textbox.value.trim();

    if (line === ""){
        console.log("line empty. ignoring")
        return
    }

    textbox.value = ""

    await appendLine(line)
}

async function runParse(){
  let consoleText = document.getElementById("consoleText")
  let result = await window.electron.runParse();

  if (result.stderr !== ""){
    consoleText.style.color = "red"
    consoleText.textContent = result.stderr
  }
  else {
    consoleText.style.color = "black"
    consoleText.textContent = result.stdout
  }

  console.log(result)


  

}


// Setup event listeners
window.addEventListener('load', async () => {
    const form = document.getElementById("config-form")



    // Read config from json and update buttons to match status
    let config = await window.electron.readConfig();

    if (config === undefined){
        await window.electron.openConfig();
        alert("Error in config json")
    }

    const ID_MAP = {
        coolantCheckbox: 'm5',
        restartCheckbox: 'replace',
        homingCheckbox: 'Z0'
      }

    for (const id in ID_MAP){
        let contents = ID_MAP[id]
        let element = document.getElementById(id)

        if (config.blacklist.includes(contents)){
            element.checked = true
        }

        // Assign listeners for all checkboxes
        element.addEventListener("change", updateConfig)
    }

    // Listener for custom line
    document.getElementById("submitCustomBlock").addEventListener("click", async () => {
        await customLineSubmit();
    })

    // Listen for open json
    document.getElementById("modifyJson").addEventListener("click", async () => {
        await window.electron.openConfig();
    })

    // Listen for parse start
    document.getElementById("start-parse").addEventListener("click", async () => {
      let button = document.getElementById("start-parse")
      button.disabled = true
      await runParse()
      button.disabled = false
    })



    form.addEventListener("submit", (e) => {
        e.preventDefault()
    })

})