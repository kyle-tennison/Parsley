// Parsley 2023
// Kyle Tennison

use chrono::Local;
use serde::Deserialize;
use serde_json;
use std::{
    fs::{self, File, OpenOptions},
    io::{BufRead, BufReader, BufWriter, Read, Write},
    path::Path,
};

#[derive(Deserialize)]
struct ConfigJson {
    blacklist: Vec<String>,
}

pub struct Parser {
    blacklist: Vec<String>,
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
            blacklist: config.blacklist,
        })
    }

    pub fn parse_file(&self, filename: &String) -> Result<bool, std::io::Error> {
        let file = File::open(filename)?;
        let reader = BufReader::new(&file);
        let signature = format!("(Parsed by Parsley on {})\n\n", format_current_date());

        let file_copy = OpenOptions::new()
            .write(true)
            .create(true)
            .open(format!("{}.tmp", filename))?;
        let mut writer = BufWriter::new(&file_copy);

        writer.write_all(signature.as_bytes())?;

        for line in reader.lines() {
            let line = line?;
            let mut valid_line = true;

            // Skip other signatures
            if line.contains("Parsley") {
                continue;
            }
            if line.is_empty(){
                continue;
            }

            for banned in &self.blacklist {
                if line.contains(banned) {
                    println!("debug: found illegal line: {}", line);
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

pub fn format_current_date() -> String {
    let now = Local::now();
    let month = now.format("%b").to_string();
    let day = now.format("%e").to_string();
    let year = now.format("%Y").to_string();
    let hour = now.format("%I").to_string();
    let minute = now.format("%M").to_string();
    let am_pm = now.format("%P").to_string();

    let day_suffix = match day.as_str().trim() {
        "1" | "21" | "31" => "st",
        "2" | "22" => "nd",
        "3" | "23" => "rd",
        _ => "th",
    };

    format!(
        "{} {}{}, {} at {}:{}{}",
        month, day, day_suffix, year, hour, minute, am_pm
    )
}
