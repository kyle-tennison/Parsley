
// extern crate serde;
// extern crate serde_json;

use std::{fs::{File, OpenOptions}, io::{Read, BufReader, BufRead, BufWriter, Write}, path::Path};

use serde::Deserialize;
use serde_json;

#[derive(Deserialize)]
struct ConfigJson {
    blacklisted_lines: Vec<String>
}

pub struct Parser {
    blacklisted_lines: Vec<String>,
    // config_filename: String
}

impl Parser {

    pub fn new(config_json_filename: &String) -> Result<Parser, std::io::Error> {

        if !Path::new(config_json_filename).exists(){
            panic!("Configuration json missing! {}", config_json_filename);
            
        }

        let mut config_file = File::open(config_json_filename)?;
        let mut contents = String::new();
        config_file.read_to_string(&mut contents)?;
        let config: ConfigJson = serde_json::from_str(&contents).unwrap();
        
        Ok(Parser{
            blacklisted_lines: config.blacklisted_lines,
            // config_filename: config_json_filename.clone()
        })

    }


    pub fn parse_file(&self, filename: &String) -> Result<bool, std::io::Error>{

        let file = File::open(filename)?;
        let reader = BufReader::new(&file);

        let mut checked_lines: Vec<String> = Vec::new();

        let mut has_invalid_line = false; // See if changing anything is necessary

        for line in reader.lines() {

            let line = line?;

            // TODO: If the stack gets over some number of lines, write it and then continue
            let mut valid_line = true;

            for banned in &self.blacklisted_lines {
                if line.contains(banned) {
                    println!("Found illegal line: {}", line);
                    valid_line = false;
                    has_invalid_line = true;
                }
            }

            if valid_line {
                checked_lines.push(line)
            }
        }


        if has_invalid_line {
            let file = OpenOptions::new()
                .write(true)
                .open(filename)
                .unwrap();

            let mut writer = BufWriter::new(&file);
            for line in checked_lines {
                println!("Writing: {}", line);
                writer.write_all(line.as_bytes())?;
                writer.write_all("\n".as_bytes())?;
            }

            writer.flush()?;
        }
        else {
            println!("Found no issues in {}", filename)
        }

        
        Ok(true)

    }

}