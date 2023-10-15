### Building For windows

Create `~/.cargo/config` and add

```
[target.x86_64-pc-windows-gnu]
linker = "x86_64-w64-mingw32-gcc"
ar = "x86_64-w64-mingw32-gcc-ar"
```

Install `mingw-w64`

Macos: `brew install mingw-w64`
Linux: `sudo apt install mingw-w64`

Build the target
`rustup target add x86_64-pc-windows-gnu` (maybe optional)
`cargo build --target x86_64-pc-windows-gnu`