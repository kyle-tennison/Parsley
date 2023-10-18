// Parsley 2023
// Kyle Tennison

mod parser;
mod util;

use parser::Parser;
use std::{
    collections::HashMap,
    env,
    fs::{self, File, OpenOptions},
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
};


// Locate root dir and storage dir from cli arguments
fn resolve_cli_paths() -> (PathBuf, PathBuf){
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

fn find_gcode_files(root_dir: PathBuf) -> Result<(Vec<String>, Vec<String>, Vec<String>), std::io::Error>{
    let mut filenames: Vec<String> = Vec::new();
    let mut filename_hashes: Vec<String> = Vec::new();
    let mut file_md5s: Vec<String> = Vec::new();

    let mut filter_queue: Vec<PathBuf> = Vec::new();

    for file in util::list_dir(Path::new(&root_dir))? {
        filter_queue.push(file);
    }

    let mut searched_files: i32 = 0;

    while filter_queue.len() > 0 {
        let path = filter_queue.pop().unwrap();
        let mut add_item = || -> Result<(), std::io::Error> {
            // Add folder contents to stack if they exist
            if util::is_directory(path.as_path()) {
                for child in util::list_dir(path.as_path())? {
                    filter_queue.push(child);
                }
            }

            // If the contents aren't from a directory, validate they are gcode
            if path.to_str().unwrap().ends_with(".gcode") {
                println!("debug: queueing {}", path.display());

                filenames.push(path.to_str().unwrap().to_string());
                let filename = filenames.last().unwrap();
                filename_hashes.push(util::hash_filename(filename));
                file_md5s.push(util::md5_hash_file(filename)?);
            }
            searched_files += 1;
            Ok(())
        };

        if let Err(_err) = add_item(){
            println!("debug: unable to explore {:?}", path)
        }
    }

    println!(
        "info: searched {} files, found {} gcode files.",
        searched_files,
        filenames.len()
    );

    // Make sure there are the same number of filenames as hashes
    assert!(
        filename_hashes.len() == filenames.len(),
        "mismatched filenames"
    );


    Ok((filenames, filename_hashes, file_md5s))
}

fn load_cache(cache_file_path: &PathBuf) -> Result<HashMap<String, String>, std::io::Error>{
    let mut cache_map: HashMap<String, String> = HashMap::new();
    let hashes_file = File::open(cache_file_path)?;
    let reader = BufReader::new(&hashes_file);

    for line in reader.lines() {
        let line = line?;

        if line.is_empty() {
            continue;
        }

        let split: Vec<&str> = line.split(" ").collect();

        if split.len() < 2 {
            eprintln!("error: invalid hashes file in cache");
            std::process::exit(1);
        }

        let filename_hash = split[0].to_string();
        let file_md5 = split[1].to_string();

        cache_map.insert(filename_hash, file_md5);
    }

    Ok(cache_map)
}

fn get_modified_and_new_files(filenames: &mut Vec<String>, filename_hashes: &mut Vec<String>, file_md5s: &mut Vec<String>, cache_map: &mut HashMap<String, String>) -> (Vec<String>, HashMap<String, String>) {
    let mut cache_buffer: HashMap<String, String> = HashMap::new();
    let mut modified_or_new_files: Vec<String> = Vec::new();
    while file_md5s.len() > 0 {
        let filename_hash = filename_hashes.pop().unwrap();
        let file_hash = file_md5s.pop().unwrap();
        let filename = filenames.pop().unwrap();

        match cache_map.get(&filename_hash) {
            Some(existing_hash) => {
                // Check if both hashes match
                if *existing_hash == file_hash {
                    println!("debug: {} is unchanged", file_hash);
                    cache_buffer.insert(filename_hash, file_hash);
                } else {
                    println!("info: found modified file {}", filename);
                    modified_or_new_files.push(filename);
                }
            }
            None => {
                // This means that there is a new file
                println!("info: found new file {}", filename);
                modified_or_new_files.push(filename);
            }
        }
    }

    (modified_or_new_files, cache_buffer)
}

fn main() -> Result<(), std::io::Error> {


    let r = resolve_cli_paths();
    let root_dir = r.0;
    let storage_dir = r.1;

    println!("debug: using root {:?}", root_dir);
    println!("debug: storage dir is: {:?}", storage_dir);

    let mut cache_file_path = storage_dir.join("./cache.txt");
    let mut config_json_path = storage_dir.join("./config.json");

    // Validate Cache path; create new file if necessary
    match fs::canonicalize(&cache_file_path){
        Ok(cannon_path) => {
            cache_file_path = cannon_path;
        }
        Err(_err) => {
            eprintln!("warn: could not find cache. expected {:?}", cache_file_path);
            
            match File::create(&cache_file_path){
                Ok(file) => {

                    println!("debug: created new cache file {:?}", file);
                }
                Err(err) => {
                    eprintln!("error: could not create cache file - {}", err);
                    std::process::exit(1);
                }
            }
        }
    }

    // Validate the json path; throw error if nonexistent 
    match fs::canonicalize(config_json_path){
        Ok(cannon_path) => {
            config_json_path = cannon_path;
        }
        Err(_err) => {
            eprintln!("error: could not locate config json");
            std::process::exit(1);
        }

    }

    println!("debug: located config json at {:?}", config_json_path);
    println!("debug: located cache at {:?}", &cache_file_path);

    // Recursively Search Gcode Files
    let r = find_gcode_files(root_dir)?;
    let mut filenames = r.0;
    let mut filename_hashes = r.1;
    let mut file_md5s = r.2;

    // Load cache into memory
    let mut cache_map = load_cache(&cache_file_path)?;

    // Load files for parse queue
    let r = get_modified_and_new_files(&mut filenames, &mut filename_hashes, &mut file_md5s, &mut cache_map);
    let parse_queue = r.0;
    let mut cache_buffer = r.1; // This will store the updated cache

    // Parse files
    let parse_queue_length = parse_queue.len();
    println!("info: found {} files to parse", parse_queue_length);
    let parser = Parser::new(&config_json_path.to_str().unwrap().to_string())?;
    for file in &parse_queue {
        println!("debug: parsing {}", file);

        // parse the file
        parser.parse_file(file)?;

        // Add new hash into map
        cache_buffer.insert(util::hash_filename(file), util::md5_hash_file(file)?);
    }

    // Write cache_buffer back into file
    let mut cache_file_w_options = OpenOptions::new() // This will replace the existing parse list
        .write(true)
        .open(&cache_file_path)
        .unwrap();


    for (filename_hash, file_md5) in &cache_buffer{
        cache_file_w_options.write_all(format!("\n{} {}", filename_hash, file_md5).as_bytes())?;
    }

    if parse_queue_length > 0{
        println!("info: successfully parsed {} gcode files", parse_queue_length);
    }

    Ok(())

}
