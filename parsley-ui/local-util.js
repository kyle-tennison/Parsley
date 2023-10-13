const fs = require('fs');

const CONFIG_FILE = "../storage/config.json"


const BLACKLIST_MAP = {
    coolant: "m5",
    spindleStart: "replace",
    homing: "Z0",
}

function write_to_config(object){

    fs.writeFile(CONFIG_FILE, JSON.stringify(object), (error) => {
        if (error) throw error;
      });
    console.log("writing:", object)
}

function read_config(){
    console.log("reading config")
    try {
        const fileData = fs.readFileSync(CONFIG_FILE, 'utf8');
        const jsonData = JSON.parse(fileData);
        return jsonData;
    } catch (error) {
        console.error(`Error reading Config Json: ${error.message}`);
        throw error
    }
}

module.exports = {
    BLACKLIST_MAP: BLACKLIST_MAP,
    write_to_config: write_to_config,
    read_config: read_config,
}