// extern crate serde;
// extern crate serde_json;

use std::{
    fs::{self, File, OpenOptions},
    io::{BufRead, BufReader, BufWriter, Read, Write},
    path::Path,
};

use serde::Deserialize;
use serde_json;

#[derive(Deserialize)]
struct ConfigJson {
    blacklisted_lines: Vec<String>,
}

pub struct Parser {
    blacklisted_lines: Vec<String>,
    // config_filename: String
}

impl Parser {
    pub fn new(config_json_filename: &String) -> Result<Parser, std::io::Error> {
        if !Path::new(config_json_filename).exists() {
            panic!("Configuration json missing! {}", config_json_filename);
        }

        let mut config_file = File::open(config_json_filename)?;
        let mut contents = String::new();
        config_file.read_to_string(&mut contents)?;
        let config: ConfigJson = serde_json::from_str(&contents).unwrap();

        Ok(Parser {
            blacklisted_lines: config.blacklisted_lines,
            // config_filename: config_json_filename.clone()
        })
    }

    pub fn parse_file(&self, filename: &String) -> Result<bool, std::io::Error> {
        let file = File::open(filename)?;
        let reader = BufReader::new(&file);

        let file_copy = OpenOptions::new()
            .write(true)
            .create(true)
            .open(format!("{}.tmp", filename))?;
        let mut writer = BufWriter::new(&file_copy);

        for line in reader.lines() {
            let line = line?;
            let mut valid_line = true;

            for banned in &self.blacklisted_lines {
                if line.contains(banned) {
                    println!("Found illegal line: {}", line);
                    valid_line = false;
                }
            }

            if valid_line {
                writer.write_all(format!("{}\n", line).as_bytes())?;
            }
        }

        // Replace with parsed gcode
        fs::remove_file(filename)?;
        fs::rename(format!("{}.tmp", filename), filename)?;

        Ok(true)
    }
}
