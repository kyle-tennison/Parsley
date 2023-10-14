// Parsley 2023
// Kyle Tennison

extern crate chrono;
extern crate sha2;

use md5::Context;
use sha2::{Digest, Sha224};
use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
};

pub fn list_dir(path: &Path) -> Result<Vec<PathBuf>, std::io::Error> {
    let mut result: Vec<PathBuf> = Vec::new();

    for item in fs::read_dir(path)? {
        let item = item?;
        let item_path = item.path();
        result.push(item_path);
    }

    Ok(result)
}

pub fn is_directory(path: &Path) -> bool {
    if let Ok(metadata) = fs::metadata(path) {
        metadata.is_dir()
    } else {
        false
    }
}

pub fn hash_filename(filename: &String) -> String {
    let mut hasher = Sha224::new();
    hasher.update(filename.as_bytes());

    let hash = hasher.finalize();
    let hash_string = format!("{:x}", hash);

    hash_string
}

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
