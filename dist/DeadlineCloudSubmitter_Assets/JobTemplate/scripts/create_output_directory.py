import argparse
import os

# Set up the argument parser
parser = argparse.ArgumentParser(
    description="Create output folders from a comma-separated list of paths."
)
parser.add_argument("outputs", type=str, help="Comma-separated list of output paths")

# Parse the arguments
args = parser.parse_args()

# Split the comma-separated paths into a list
output_list = args.outputs.split(",")

print("Creating output folders.")

# Loop through each output path and create the necessary folder
for output in output_list:
    # Get the directory path (equivalent to 'Split-Path' in PowerShell)
    dir_path = os.path.dirname(output)

    # Create the directory if it doesn't exist (equivalent to 'md -Force' in PowerShell)
    os.makedirs(dir_path, exist_ok=True)

print("Output folders created.")
