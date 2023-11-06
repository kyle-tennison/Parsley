/*

Parsley: A gcode parser

Kyle Tennison
October 2023

*/

extern crate chrono;
extern crate ring;
use ring::digest;
use md5::Context;

use std::{
    env, fs,
    io::Read,
    path::{Path, PathBuf},
};

/// Targeted filename extensions
const EXTENSIONS: &'static [&str] = &[".gcode", ".tap", ".nc"];

/// Lists items in a directory
pub fn list_dir(path: &Path) -> Result<Vec<PathBuf>, std::io::Error> {
    let mut result: Vec<PathBuf> = Vec::new();

    for item in fs::read_dir(path)? {
        let item = item?;
        let item_path = item.path();
        result.push(item_path);
    }

    Ok(result)
}

/// Checks if a path is a directory
pub fn is_directory(path: &Path) -> bool {
    if let Ok(metadata) = fs::metadata(path) {
        metadata.is_dir()
    } else {
        false
    }
}

/// Hashes a filepath
pub fn hash_filepath(filename: &String) -> String {
    let digest = digest::digest(&digest::SHA256, filename.as_bytes());

    let hash_hex: String = digest.as_ref()
        .iter()
        .map(|byte| format!("{:02x}", byte))
        .collect();
    hash_hex[0..32].to_string() // Truncate to 32 char 
}

/// Calculates the md5 hash of a file
pub fn md5_hash_file(file_path: &str) -> Result<String, std::io::Error> {
    let mut file = std::fs::File::open(file_path)?;
    let mut buffer = [0u8; 1024];
    let mut context = Context::new();

    loop {
        match file.read(&mut buffer) {
            Ok(0) => break,
            Ok(n) => {
                context.consume(&buffer[0..n]);
            }
            Err(e) => return Err(e),
        }
    }

    Ok(format!("{:x}", context.compute()))
}

/// Locate root dir and storage dir from cli arguments
pub fn resolve_cli_paths() -> (PathBuf, PathBuf) {
    // Load cli arguments
    let args: Vec<String> = env::args().collect();

    if args.len() < 3 {
        eprintln!("error: missing arguments\n    usage: parsley-inner <root-dir> <storage-dir>");
        std::process::exit(1);
    }

    let root_dir: PathBuf;
    let storage_dir: PathBuf;

    match fs::canonicalize(&args[1]) {
        Ok(dir) => {
            root_dir = dir;
        }
        Err(_err) => {
            eprintln!("error: failed to find root '{}'", args[1]);
            std::process::exit(1)
        }
    }

    match fs::canonicalize(&args[2]) {
        Ok(dir) => {
            storage_dir = dir;
        }
        Err(_err) => {
            eprintln!("error: failed to find storage dir '{}'", args[2]);
            std::process::exit(1)
        }
    }

    // Verify that filepaths are valid
    if let Ok(metadata) = fs::metadata(&root_dir) {
        if metadata.is_file() {
            eprintln!("error: root {:?} is a file, not a dir", root_dir);
            std::process::exit(1)
        } else if metadata.is_dir() {
            // Everything is good
        } else {
            eprintln!("error: root {:?} does not exist", root_dir);
            std::process::exit(1);
        }
    } else {
        eprintln!("error: root {:?} does not exist", root_dir);
        std::process::exit(1);
    }

    if let Ok(metadata) = fs::metadata(&storage_dir) {
        if metadata.is_file() {
            eprintln!("error: root {:?} is a file, not a dir", storage_dir);
            std::process::exit(1)
        } else if metadata.is_dir() {
            // Everything is good
        } else {
            eprintln!("error: storage dir {:?} does not exist", storage_dir);
            std::process::exit(1);
        }
    } else {
        eprintln!("error: storage dir {:?} does not exist", storage_dir);
        std::process::exit(1);
    }

    (root_dir, storage_dir)
}

/// Determine whether a file extension is a toolpath
pub fn is_toolpath(filename: &String) -> bool {
    for ext in EXTENSIONS {
        if filename.ends_with(ext) {
            return true;
        }
    }
    return false;
}
