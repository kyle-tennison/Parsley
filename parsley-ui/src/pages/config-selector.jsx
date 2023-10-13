// const { ipcRenderer } = window.require('electron');
// const fs = window.require('fs')


// import { write_to_config, read_config, BLACKLIST_MAP } from "../util"

// import { useState, useEffect } from "react";

// export function ConfigSelector() {

//     let [coolantBlock, setCoolantBlock] = useState(false)
//     let [homingBlock, setHomingBlock] = useState(false)
//     let [spindleStartBlock, setSpindleStartBlock] = useState(false)

//     function handleSubmit(event){
//         event.preventDefault();
//     }

//     useEffect(() => {
//         console.log("update config json...")

//         let current_config = read_config()
//         let new_blacklist = []

//         let selections = {
//             "coolant" : coolantBlock,
//             "spindleStart": spindleStartBlock ,
//             "homing" : homingBlock
//         }

//         // Update settings for all the default keys
//         for (const key in selections){
//             let blocked = selections[key] 
//             if (blocked) {
//                 // Add the blocked key 
//                 new_blacklist.push(BLACKLIST_MAP[key])
//             }
//         }

        
//         // Add back the custom keys
//         // TODO: Add a way to remove custom keys
//         for (const key in current_config.blacklist){
//             let item = current_config.blacklist[key]
//             if (!Object.values(BLACKLIST_MAP).includes(item)){
//                 new_blacklist.push(item)
//             }
//         }
        
//         // Write changes to json
//         current_config.blacklist = new_blacklist
//         write_to_config(current_config)
        
//     })

//     const button = document.getElementById('<your_button_id>');
//     button.addEventListener('click', () => {
//     createBrowserWindow();
//     });

//     function createBrowserWindow() {
//     const remote = require('electron').remote;
//     const BrowserWindow = remote.BrowserWindow;
//     const win = new BrowserWindow({
//         height: 600,
//         width: 800
//     });

//     win.loadURL('<url>');
//     }

//     return <div id="config-selector">
//         <h3>Set Blacklist</h3>
//         <form
//         onSubmit={(e) => {handleSubmit(e)}}>
//             <div>
//                 <input
//                     type="checkbox"
//                     id="setCoolant"
//                     value={coolantBlock}
//                     onChange={(e) => {
//                         setCoolantBlock(e.target.checked)
//                     }}
//                 />
//                 <label>Disable Coolant</label>
//             </div>
//             <div>
//                 <input
//                     type="checkbox"
//                     id="setHoming"
//                     value={homingBlock}
//                     onChange={(e) => {
//                         setHomingBlock(e.target.checked)
//                     }}
//                 />
//                 <label>Disable Homing</label>
//             </div>
//             <div>
//                 <input
//                     type="checkbox"
//                     id="setSpindleStart"
//                     value={spindleStartBlock}
//                     onChange={(e) => {
//                         setSpindleStartBlock(e.target.checked)
//                     }}
//                 />
//                 <label>Disable Spindle Start</label>
//             </div>
//             <div>
//                 <button>
//                     Add Custom
//                 </button>
//             </div>
//         </form>

//     </div>
// }