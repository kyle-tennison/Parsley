// Parsley 2023
// Kyle Tennison

mod parser;
mod util;

use parser::Parser;
use std::{
    collections::HashMap,
    env,
    fs::{self, File, OpenOptions},
    io::{BufRead, BufReader, BufWriter, Write},
    path::{Path, PathBuf},
};

fn main() -> Result<(), std::io::Error> {
    // Load cli arguments
    let args: Vec<String> = env::args().collect();

    if args.len() < 3 {
        eprintln!("error: missing arguments\n\tusage: parsley-inner <root-dir> <storage-dir>");
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

    println!("debug: using root {:?}", root_dir);
    println!("debug: storage dir is: {:?}", storage_dir);

    let mut parsed_list_file = storage_dir.join("./parsed_list.txt");
    let mut config_json = storage_dir.join("./config.json");

    if let Ok(abspath) = fs::canonicalize(&parsed_list_file) {
        parsed_list_file = abspath;
    } else {
        eprintln!(
            "error: could not locate cache. expected {:?}",
            parsed_list_file
        );
        std::process::exit(1);
    }
    if let Ok(abspath) = fs::canonicalize(config_json) {
        config_json = abspath;
    } else {
        eprintln!("error: could not locate config json");
        std::process::exit(1);
    }

    println!("debug: located config json at {:?}", config_json);
    println!("debug: located cache at {:?}", &parsed_list_file);

    let mut filenames: Vec<String> = Vec::new();
    let mut filename_hashes: Vec<String> = Vec::new();
    let mut file_hashes: Vec<String> = Vec::new();

    let mut filter_queue: Vec<PathBuf> = Vec::new();

    for file in util::list_dir(Path::new(&root_dir))? {
        filter_queue.push(file);
    }

    let mut searched_files: i32 = 0;

    while filter_queue.len() > 0 {
        let file = filter_queue.pop().unwrap();

        // Add folder contents to stack if they exist
        if util::is_directory(file.as_path()) {
            for child in util::list_dir(file.as_path())? {
                filter_queue.push(child);
            }
            continue;
        }

        // If the contents aren't from a directory, validate they are gcode
        if file.to_str().unwrap().ends_with(".gcode") {
            println!("debug: queueing {}", file.display());

            filenames.push(file.to_str().unwrap().to_string());
            let filename = filenames.last().unwrap();
            filename_hashes.push(util::hash_filename(filename));
            file_hashes.push(util::md5_hash_file(filename)?);
        }
        searched_files += 1;
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

    // Load Previously Parsed Files
    let mut previously_parsed: HashMap<String, String> = HashMap::new();
    let hashes_file = File::open(&parsed_list_file)?;
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

        previously_parsed.insert(filename_hash, file_md5);
    }

    // Search for modified/new files
    let tmp_copy_filename = format!("{}{}", parsed_list_file.to_str().unwrap(), ".tmp");
    fs::copy(&parsed_list_file, &tmp_copy_filename)?;

    let tmp_copy = OpenOptions::new() // This will replace the existing parse list
        .write(true)
        .append(true)
        .open(tmp_copy_filename)
        .unwrap();
    let mut writer = BufWriter::new(&tmp_copy);

    let mut parse_queue: Vec<String> = Vec::new();
    while file_hashes.len() > 0 {
        let filename_hash = filename_hashes.pop().unwrap();
        let file_hash = file_hashes.pop().unwrap();
        let filename = filenames.pop().unwrap();

        match previously_parsed.get(&filename_hash) {
            Some(existing_hash) => {
                // Check if both hashes match
                if *existing_hash == file_hash {
                    println!("debug: {} is unchanged", file_hash);
                    writer.write_all(format!("{} {}\n", filename_hash, file_hash).as_bytes())?;
                } else {
                    println!("info: found modified file {}", filename);
                    parse_queue.push(filename);
                }
            }
            None => {
                // This means that there is a new file
                println!("info: found new file {}", filename);
                parse_queue.push(filename);
            }
        }
    }

    // Parse files
    println!("info: found {} files to parse", parse_queue.len());
    let parser = Parser::new(&config_json.to_str().unwrap().to_string())?;
    for file in &parse_queue {
        println!("debug: parsing {}", file);

        // parse the file
        parser.parse_file(file)?;

        // Add new hash into file
        let newline = format!(
            "\n{} {}",
            util::hash_filename(file),
            util::md5_hash_file(file)?
        )
        .to_string();

        writer.write_all(newline.as_bytes())?;
        writer.flush()?;
    }

    // Replace parse-list with new one
    fs::remove_file(&parsed_list_file)?;
    fs::rename(
        format!("{}{}", parsed_list_file.to_str().unwrap(), ".tmp"),
        parsed_list_file,
    )?;

    Ok(())
}
