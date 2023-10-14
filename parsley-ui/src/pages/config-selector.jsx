import { writeConfig, readConfig, BLACKLIST_MAP, openJson } from '../util'
import { useState, useEffect } from 'react'

export function ConfigSelector() {
  let [coolantBlock, setCoolantBlock] = useState(false)
  let [homingBlock, setHomingBlock] = useState(false)
  let [spindleStartBlock, setSpindleStartBlock] = useState(false)
  let [customLine, setCustomLine] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
  }

  useEffect(() => {
    console.log('update config json...')

    let current_config = readConfig()
    let new_blacklist = []

    let selections = {
      coolant: coolantBlock,
      spindleStart: spindleStartBlock,
      homing: homingBlock
    }

    // Update settings for all the default keys
    for (const key in selections) {
      let blocked = selections[key]
      if (blocked) {
        // Add the blocked key
        new_blacklist.push(BLACKLIST_MAP[key])
      }
    }

    // Add back the custom keys
    // TODO: Add a way to remove custom keys
    for (const key in current_config.blacklist) {
      let item = current_config.blacklist[key]
      if (!Object.values(BLACKLIST_MAP).includes(item)) {
        new_blacklist.push(item)
      }
    }

    // Write changes to json
    current_config.blacklist = new_blacklist
    writeConfig(current_config)
  }, [coolantBlock, homingBlock, spindleStartBlock])

  function appendLine(line) {
    if (line === ""){
        console.log("line is empty, skipping")
        return
    }
    let current_config = readConfig()
    console.log('pre-modify is:', current_config.blacklist)
    let blacklist = current_config.blacklist

    if (blacklist.includes(line)) {
      console.warn(`Skipping add '${line}'. Already in blacklist.`)
      return
    }

    blacklist.push(line)
    console.log('modified config:', blacklist)
    current_config.blacklist = blacklist
    console.log('new config:', current_config)
    writeConfig(current_config)
  }


  return (
    <div id="config-selector">
      <h3>Set Blacklist</h3>
      <form
        onSubmit={e => {
          handleSubmit(e)
        }}
      >
        <div>
          <input
            type="checkbox"
            id="setCoolant"
            value={coolantBlock}
            onChange={e => {
              setCoolantBlock(e.target.checked)
            }}
          />
          <label>Disable Coolant</label>
        </div>
        <div>
          <input
            type="checkbox"
            id="setHoming"
            value={homingBlock}
            onChange={e => {
              setHomingBlock(e.target.checked)
            }}
          />
          <label>Disable Homing</label>
        </div>
        <div>
          <input
            type="checkbox"
            id="setSpindleStart"
            value={spindleStartBlock}
            onChange={e => {
              setSpindleStartBlock(e.target.checked)
            }}
          />
          <label>Disable Spindle Start</label>
        </div>
        <div>
          <input
            id="customBlock"
            type="textentry"
            placeholder="Block Custom Line"
            value={customLine}
            onChange={e => {
              setCustomLine(e.target.value)
            }}
          />
          <button
            id="submitCustomBlock"
            onClick={e => {
              appendLine(customLine)
              setCustomLine('')
            }}
          >
            Block
          </button>
          </div>
          <div>
          <button
            id="modifyJson"
            onClick={e => {
              openJson()
            }}
          >
            Modify Json
          </button>
        </div>
      </form>
    </div>
  )
}
