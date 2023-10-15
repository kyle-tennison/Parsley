const path = require("path");

module.exports = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        iconUrl: "https://url/to/icon.ico",
        setupIcon: "build-resources/icon.ico",
        authors: "Kyle Tennison",
        name: "Install Parsley",
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        icon: "build-resources/icon.png",
      },
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {
        icon: "build-resources/icon.icns",
      },
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
  ],
  packagerConfig: {
    icon: path.join(
      process.cwd(),
      "build-resources/icon",
      "build-resources/icon.icns",
    ),
    extraResource: [
      path.join(
        process.cwd(),
        "build-resources/icon",
        "build-resources/icon.icns",
      ),
    ],
  },
};
