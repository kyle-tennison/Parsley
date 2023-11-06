/*

Parsley: A gcode parser

Kyle Tennison
October 2023

*/

pub mod parsley {

    use crate::parser::parser;
    use crate::util;
    use std::{
        collections::HashMap,
        fs::{self, File, OpenOptions},
        io::{BufRead, BufReader, Write},
        path::{Path, PathBuf},
    };

    pub struct Parsley {
        root_dir: PathBuf,
        storage_dir: PathBuf,
        filenames: Vec<String>,
        hashed_paths: Vec<String>,
        file_md5s: Vec<String>,
    }

    impl Parsley {
        pub fn new(root_dir: PathBuf, storage_dir: PathBuf) -> Parsley {
            Parsley {
                root_dir,
                storage_dir,
                filenames: Vec::new(),
                hashed_paths: Vec::new(),
                file_md5s: Vec::new(),
            }
        }

        pub fn find_gcode_files(&mut self) -> Result<(), std::io::Error> {
            let mut filter_queue: Vec<PathBuf> = Vec::new();
            for file in util::list_dir(Path::new(&self.root_dir))? {
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
                    if util::is_toolpath(&path.to_str().unwrap().to_string()) {
                        println!("debug: queueing {}", path.display());
                        self.filenames.push(path.to_str().unwrap().to_string());
                        let filename = self.filenames.last().unwrap();
                        self.hashed_paths.push(util::hash_filepath(filename));
                        self.file_md5s.push(util::md5_hash_file(filename)?);
                    }
                    searched_files += 1;
                    Ok(())
                };

                if let Err(_err) = add_item() {
                    println!("debug: unable to explore {:?}", path)
                }
            }

            println!(
                "info: searched {} files, found {} gcode files.",
                searched_files,
                self.filenames.len()
            );

            // Make sure there are the same number of filenames as hashes
            assert!(
                self.hashed_paths.len() == self.filenames.len(),
                "mismatched filenames"
            );

            Ok(())
        }

        fn get_modified_and_new_files(
            &mut self,
            cache_map: &mut HashMap<String, String>,
        ) -> (Vec<String>, HashMap<String, String>) {
            let mut cache_buffer: HashMap<String, String> = HashMap::new();
            let mut modified_or_new_files: Vec<String> = Vec::new();
            while self.file_md5s.len() > 0 {
                let hashed_path = self.hashed_paths.pop().unwrap();
                let file_hash = self.file_md5s.pop().unwrap();
                let filename = self.filenames.pop().unwrap();

                match cache_map.get(&hashed_path) {
                    Some(existing_hash) => {
                        // Check if both hashes match
                        if *existing_hash == file_hash {
                            cache_buffer.insert(hashed_path, file_hash);
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

        fn load_cache(
            &self,
            cache_file_path: &PathBuf,
        ) -> Result<HashMap<String, String>, std::io::Error> {
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

                let hashed_path = split[0].to_string();
                let file_md5 = split[1].to_string();

                cache_map.insert(hashed_path, file_md5);
            }

            Ok(cache_map)
        }

        /// Runs parsley
        pub fn run(&mut self) -> Result<(), std::io::Error> {
            println!("Ran");

            println!("debug: using root {:?}", &self.root_dir);
            println!("debug: storage dir is: {:?}", &self.storage_dir);

            let mut cache_file_path = self.storage_dir.join("./cache.txt");
            let mut config_json_path = self.storage_dir.join("./config.json");

            // Validate Cache path; create new file if necessary
            match fs::canonicalize(&cache_file_path) {
                Ok(cannon_path) => {
                    cache_file_path = cannon_path;
                }
                Err(_err) => {
                    eprintln!("warn: could not find cache. expected {:?}", cache_file_path);

                    match File::create(&cache_file_path) {
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
            match fs::canonicalize(config_json_path) {
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
            self.find_gcode_files()?;

            // Load cache into memory
            let mut cache_map = self.load_cache(&cache_file_path)?;

            // Load files for parse queue
            let r = self.get_modified_and_new_files(&mut cache_map);
            let parse_queue = r.0;
            let mut cache_buffer = r.1; // This will store the updated cache

            // Parse files
            let parse_queue_length = parse_queue.len();
            println!("info: found {} files to parse", parse_queue_length);
            let parser = parser::Parser::new(&config_json_path.to_str().unwrap().to_string())?;
            for file in &parse_queue {
                println!("debug: parsing {}", file);

                // parse the file
                parser.parse_file(file)?;

                // Add new hash into map
                cache_buffer.insert(util::hash_filepath(file), util::md5_hash_file(file)?);
            }

            // Write cache_buffer back into file
            let mut cache_file_w_options = OpenOptions::new() // This will replace the existing parse list
                .write(true)
                .open(&cache_file_path)
                .unwrap();

            for (hashed_path, file_md5) in &cache_buffer {
                cache_file_w_options
                    .write_all(format!("\n{} {}", hashed_path, file_md5).as_bytes())?;
            }

            if parse_queue_length > 0 {
                println!(
                    "info: successfully parsed {} gcode files",
                    parse_queue_length
                );
            }

            Ok(())
        }
    }
}
