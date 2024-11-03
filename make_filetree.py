import os
from pathlib import Path
import argparse
import sys

def generate_tree(directory: Path, prefix: str = "", ignore_patterns: set = None, script_path: Path = None) -> str:
    """
    Recursively generate a tree representation of the directory structure.
    
    Args:
        directory (Path): The directory to generate tree for
        prefix (str): Current line prefix for formatting
        ignore_patterns (set): Set of patterns to ignore (e.g., {'.git', '__pycache__'})
        script_path (Path): Path to the script itself, to ignore it from the output
    
    Returns:
        str: Tree representation of the directory
    """
    if ignore_patterns is None:
        ignore_patterns = {'.git', '__pycache__', '.pytest_cache', '.venv', 'venv', 'node_modules'}
    
    # Initialize output string with current directory name
    output = f"{prefix}📁 {directory.name}/\n"
    
    # Get all items in directory
    try:
        items = list(directory.iterdir())
    except PermissionError:
        return output + f"{prefix}├── Permission Denied\n"
    
    # Sort items (directories first, then files)
    items.sort(key=lambda x: (not x.is_dir(), x.name.lower()))
    
    # Process each item
    for index, item in enumerate(items):
        # Skip ignored patterns and the script itself
        if any(pattern in str(item) for pattern in ignore_patterns) or (script_path and item.resolve() == script_path):
            continue
        
        # Determine if this is the last item
        is_last = index == len(items) - 1
        
        # Create appropriate prefix for subdirectories/files
        curr_prefix = prefix + ("└── " if is_last else "├── ")
        next_prefix = prefix + ("    " if is_last else "│   ")
        
        if item.is_dir():
            # Recursively process subdirectories
            output += generate_tree(item, next_prefix, ignore_patterns, script_path)
        else:
            # Add file to tree
            file_icon = "📄 " if item.suffix != '.py' else "🐍 "
            output += f"{curr_prefix}{file_icon}{item.name}\n"
    
    return output

def main():
    parser = argparse.ArgumentParser(description="Generate a directory tree visualization")
    parser.add_argument('--path', type=str, default='.',
                       help='Path to generate tree from (default: current directory)')
    parser.add_argument('--output', type=str, help='Output file path (optional)')
    parser.add_argument('--ignore', type=str, nargs='+', 
                       help='Additional patterns to ignore (optional)')
    
    args = parser.parse_args()
    
    # Set up directory and ignore patterns
    directory = Path(args.path).resolve()
    ignore_patterns = {'.git', '__pycache__', '.pytest_cache', '.venv', 'venv', 'node_modules'}
    
    if args.ignore:
        ignore_patterns.update(args.ignore)
    
    # Get the path to this script
    script_path = Path(sys.argv[0]).resolve()
    
    # Generate tree
    tree = generate_tree(directory, ignore_patterns=ignore_patterns, script_path=script_path)
    
    # Output handling
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(tree)
        print(f"Tree written to {args.output}")
    else:
        print(tree)

if __name__ == "__main__":
    main()