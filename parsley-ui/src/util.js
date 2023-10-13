const fs = window.require('fs');
const path = window.require('path')

const CONFIG_FILE = "../storage/config.json"


const BLACKLIST_MAP = {
    coolant: "m5",
    spindleStart: "replace",
    homing: "Z0",
}

function writeConfig(object){

    fs.writeFile(CONFIG_FILE, JSON.stringify(object), (error) => {
        if (error) throw error;
      });
    console.log("writing:", object)
}

function readConfig(){

    // const jsonPath = "../storage/"
    // console.log("jsonpath:", jsonPath)

    // fs.readdir(jsonPath, (err, files) => {
    //     if (err) {
    //       console.error(`Error reading directory: ${err}`);
    //     } else {
    //       console.log('Contents of the directory:');
    //       files.forEach((file) => {
    //         console.log(file);
    //       });
    //     }
    //   });
    // return {}
    console.log("reading config...")
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
    writeConfig: writeConfig,
    readConfig: readConfig,
}