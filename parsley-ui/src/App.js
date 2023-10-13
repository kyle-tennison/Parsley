import { useState, useMemo } from 'react'
import { FilesViewer } from './FilesViewer'
import { Home } from './pages/home'

const fs = window.require('fs')
const pathModule = window.require('path')

const { app } = window.require('@electron/remote')

function App() {
  
  return (
    <div>
      <Home />
    </div>
  )
}

export default App
