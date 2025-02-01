import argparse
import os

# Set up the argument parser
parser = argparse.ArgumentParser(
    description="Create output folders from a comma-separated list."
)
parser.add_argument("outputs", type=str, help="Comma-separated list of output folders")

# Parse the arguments
args = parser.parse_args()

# Split the comma-separated paths into a list
output_list = args.outputs.split(",")

print(f"Creating output folders {output_list}")

# Loop through each output path and create the necessary folder
for output in output_list:
    # Create the directory if it doesn't exist (equivalent to 'md -Force' in PowerShell)
    os.makedirs(output, exist_ok=True)

print("Output folders created.")
