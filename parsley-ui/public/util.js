const fs = require('fs');

const CONFIG_FILE = "../storage/config.json"


export const BLACKLIST_MAP = {
    coolant: "m5",
    spindleStart: "replace",
    homing: "Z0",
}

export function write_to_config(object){

    fs.writeFile(CONFIG_FILE, JSON.stringify(object), (error) => {
        if (error) throw error;
      });
    console.log("writing:", object)
}

export function read_config(){
    try {
        const fileData = fs.readFileSync(CONFIG_FILE, 'utf8');
        const jsonData = JSON.parse(fileData);
        return jsonData;
    } catch (error) {
        console.error(`Error reading Config Json: ${error.message}`);
        throw error
    }
}
