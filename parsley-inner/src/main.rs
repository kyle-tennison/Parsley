/*

Parsley: A gcode parser

Kyle Tennison
October 2023

*/

mod parser;
mod parsley;
mod util;

fn main() -> Result<(), std::io::Error> {
    let cli_paths = util::resolve_cli_paths();
    let mut p = parsley::Parsley::new(cli_paths.0, cli_paths.1);
    p.run()?;

    Ok(())
}
