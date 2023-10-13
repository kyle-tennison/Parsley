use std::collections::HashMap;
use std::fs;
use std::fs::File;
use std::fs::OpenOptions;
use std::io::BufRead;
use std::io::BufReader;
use std::io::BufWriter;
use std::io::Write;
use std::path::Path;
use std::path::PathBuf;
use md5::Context;
use std::io::Read;

mod parser;
use parser::Parser;

extern crate sha2;
use sha2::{Digest, Sha224};


const PARSED_LIST_FILE: &str = "../storage/parse-list.txt";
const CONFIG_JSON: &str = "../storage/config.json";

fn main() -> Result<(), std::io::Error>{
    let start_dir = "..";

    let mut filenames: Vec<String> = Vec::new();
    let mut filename_hashes: Vec<String> = Vec::new();
    let mut file_hashes: Vec<String> = Vec::new();

    let mut filter_queue: Vec<PathBuf> = Vec::new();

    match list_dir(Path::new(start_dir)) {
        Ok(files) => {
            for file in files {
                filter_queue.push(file)
            }
        }
        Err(err) => {
            eprintln!("Failed to list dir: {}", err)
        }
    }

    while filter_queue.len() > 0 {
        let file = filter_queue.pop().unwrap();

        // Add folder contents to stack if they exist
        if is_directory(file.as_path()) {
            match list_dir(file.as_path()) {
                Ok(children) => {
                    for child in children {
                        filter_queue.push(child);
                    }
                }
                Err(err) => {
                    eprintln!("Failed to list dir: {}", err);
                }
            }
        }

        // If the contents aren't from a directory, validate they are gcode
        if file.to_str().unwrap().ends_with(".gcode") {
            println!("Queueing {}", file.display());

            filenames.push(file.to_str().unwrap().to_string());
            let filename = filenames.last().unwrap();
            filename_hashes.push(hash_filename(filename));

            match md5_hash_file(filename){
                Ok(file_hash) => {
                    file_hashes.push(file_hash);
                }
                Err (err) => {
                    eprintln!("Error hashing file: {}", err);
                }
            }

        }
    }

    // Make sure there are the same number of filenames as hashes
    assert!(
        filename_hashes.len() == filenames.len(),
        "mismatched filenames"
    );


    // Load Previously Parsed Files
    let mut previously_parsed: HashMap<String, String> = HashMap::new();
    let hashes_file = File::open(PARSED_LIST_FILE)?;
    let reader = BufReader::new(hashes_file);
    
    for line in reader.lines() {
        let line = line?;

        if line.is_empty(){
            continue
        }
        
        let split: Vec<&str> = line.split(" ").collect();
        
        if split.len() < 2 {
            eprintln!("Error in hashes file '{}'", PARSED_LIST_FILE);
            return Ok(());
        }

        let filename_hash = split[0].to_string();
        let file_md5 = split[1].to_string();
        
        previously_parsed.insert(filename_hash, file_md5);
    
    }

    

    // Search for modified/new files
    let mut tmp_copy = OpenOptions::new() // This will replace the existing parse list
    .write(true)
    .create(true)
    .open(format!("{}{}", PARSED_LIST_FILE, ".tmp") )
    .unwrap();
    let mut writer = BufWriter::new(&tmp_copy);

    let mut parse_queue: Vec<String> = Vec::new();
    while file_hashes.len() > 0 {
        let filename_hash = filename_hashes.pop().unwrap();
        let file_hash = file_hashes.pop().unwrap();
        let filename = filenames.pop().unwrap();

        match previously_parsed.get(&filename_hash){
            Some(existing_hash) => {
                // Check if both hashes match
                if *existing_hash == file_hash {
                    println!("debug: {} is unchanged", file_hash);
                    writer.write_all(format!("{} {}\n", filename_hash, file_hash).as_bytes())?;
                }
                else {
                    println!("Found modified file {}", filename);
                    parse_queue.push(filename);
                }
            },
            None => {
                // This means that there is a new file
                println!("Found new file {}", filename);
                parse_queue.push(filename);
            },
        }

    }

    // Parse files
    println!("Found {} files to parse", parse_queue.len());
    let parser = Parser::new(&CONFIG_JSON.to_string())?;
    for file in &parse_queue {
        println!("Parsing {}", file);

        // parse the file
        parser.parse_file(file)?;

        // Add new hash into file
        let newline = format!(
                "\n{} {}", 
                hash_filename(file),
                md5_hash_file(file)?
        ).to_string();

        writer.write_all(newline.as_bytes())?;
        writer.flush()?;
    }

    // Replace parse-list with new one
    fs::remove_file(PARSED_LIST_FILE)?;
    fs::rename(format!("{}{}", PARSED_LIST_FILE, ".tmp"), PARSED_LIST_FILE)?;

    Ok(())

}

fn list_dir(path: &Path) -> Result<Vec<PathBuf>, std::io::Error> {
    let mut result: Vec<PathBuf> = Vec::new();

    for item in fs::read_dir(path)? {
        let item = item?;
        let item_path = item.path();
        result.push(item_path);
    }

    Ok(result)
}

fn is_directory(path: &Path) -> bool {
    if let Ok(metadata) = fs::metadata(path) {
        metadata.is_dir()
    } else {
        false
    }
}

fn hash_filename(filename: &String) -> String {
    let mut hasher = Sha224::new();
    hasher.update(filename.as_bytes());

    let hash = hasher.finalize();
    let hash_string = format!("{:x}", hash);

    hash_string
}

fn md5_hash_file(file_path: &str) -> Result<String, std::io::Error> {
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