import React from "react";
// import { createRoot } from 'react-dom/client';

// import App from './App'

// const container = document.getElementById("root")

// const root = createRoot(container)
// root.render(App)

document.getElementById(
  "root",
).textContent = `This app is using Chrome (v${versions.chrome()}), Node.js (v${versions.node()}), and Electron (v${versions.electron()})`;

const func = async () => {
  let response = await window.versions.readConfig();
  console.log(response); // prints out 'pong'
  response.success = true;
  await window.versions.writeConfig(response);
  response = await window.versions.readConfig();
  console.log(response); // prints out 'pong'
};

func();
