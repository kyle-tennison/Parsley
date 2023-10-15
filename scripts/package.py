# Parsley 2023
# Kyle Tennison

import os
import sys
import shutil


def maybe_makedir(path):
    try:
        os.mkdir(path)
    except FileExistsError:
        return

def main():

    if len(sys.argv) < 2:
        print("Specify Platform:\n"
              "  Example: python package.py [PLATFORM]\n\n"
              "  Platform Options:\n"
              "  darwin: MacOS\n"
              "  win: Windows\n"
              )
        exit(1)
        
    platform = sys.argv[1].lower()

    if platform not in ["darwin", "win"]:
        print(f"Error: Unknown platform '{platform}'")

    scripts_dir =os.path.abspath(os.path.dirname(__file__))

    os.chdir(scripts_dir)

    os.makedirs(os.path.join(scripts_dir, "../build"), exist_ok=True)

    if platform == 'darwin':
        print("Building for darwin")
        os.chdir("../parsley-ui")
        os.system("npm run package:darwin")

        print("Copying to build")
        build_dir = os.path.join(os.getcwd(), "../build/build-darwin")

        # Remove existing build dir
        if os.path.exists(build_dir):
            shutil.rmtree(build_dir, ignore_errors=True)
        maybe_makedir(build_dir)

        shutil.copytree(
            os.path.join(os.getcwd(), "out/Parsley-darwin-arm64/Parsley.app"),
            os.path.join(build_dir, "Parsley.app")
            )
        
        print("Built Parsley.app")
        print("Building rust")


        os.chdir(os.path.join(os.getcwd(), "../parsley-inner"))
        os.system("cargo build --release")

        resources_dir = os.path.join(build_dir, "Parsley.app/Contents/Resources")

        shutil.copy(
            os.path.join(os.getcwd(), "target/release/parsley-inner"),
            os.path.join(resources_dir)
        )
        

    elif platform == "win":
        print("Building for win")
        os.chdir("../parsley-ui")
        os.system("npm run package:win")

        print("Copying to build")
        build_dir = os.path.join(os.getcwd(), "../build/build-win")

        # Remove existing build dir
        if os.path.exists(build_dir):
            shutil.rmtree(build_dir, ignore_errors=True)

        shutil.copytree(
            os.path.join(os.getcwd(), "out/Parsley-win32-ia32"),
            os.path.join(build_dir)
            )
        
        resources_dir = os.path.join(build_dir, "resources")

        print("Built Parsley.exe")
        print("Building rust")


        os.chdir(os.path.join(os.getcwd(), "../parsley-inner"))
        os.system("cargo build --release --target x86_64-pc-windows-gnu")

        shutil.copy(
            os.path.join(os.getcwd(), "target/x86_64-pc-windows-gnu/release/parsley-inner.exe"),
            os.path.join(resources_dir)
        )

        

    else:
        print("Invalid platform", platform)
        exit(1)

    # Load default files
    os.chdir(resources_dir)
    with open("config.json", "w") as f:
        f.write("{\"blacklist\":[]}")
    open("parsed_list.txt", "w").close()



if __name__ == "__main__":
    main()


