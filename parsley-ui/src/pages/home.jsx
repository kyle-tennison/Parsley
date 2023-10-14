import './home.css'

import { ConfigSelector } from './config-selector'

export function Home() {
  return (
    <div id="home-page">
      <h1>Parsley</h1>
      <div className="subtitle divider">A minimal gcode parser</div>
      <button id="start-parse">
        <a>Parse Now</a>
      </button>
      <div id="controls-container">
        <div className="right">
          <ConfigSelector />
        </div>
        <div className="left">placeholder</div>
      </div>
    </div>
  )
}
