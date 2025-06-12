import os

# Allowed directory path (e.g., ~/projects/)
ALLOWED_DIR = "~/projects"

def sanitize_path(path: str) -> str:
    """
    Sanitizes the given path by:
    1. Ensuring the path does not contain '..' or '.'
    2. Ensuring the directory matches the allowed root directory
    3. Ensuring only build.zip and backend.zip can be used.
    4. Ensuring no scripts in build or backend can be used.
    """
    # Extract filename and directory
    filename = os.path.basename(path)
    dir_name = os.path.dirname(path)
    
    abs_dir = os.path.abspath(dir_name)
    abs_allowed_dir = os.path.abspath(ALLOWED_DIR)

    if '..' in dir_name or '.' in dir_name:
        raise ValueError(f"Invalid path: {dir_name} contains forbidden patterns '..' or '.'.")
    
    if not (filename.endswith(".zip") or filename.endswith(".sh")):
        raise ValueError(f"Invalid filename: {filename} does not end with .zip.")
    
    if filename.endswith(".zip"):
        if not filename.endswith("build.zip") or filename.endswith("backend.zip"):
            raise ValueError(f"You can only copy build.zip or backend.zip")
        
    if filename.endswith(".sh"):
        if '/backend/' in abs_dir or '/build/' in abs_dir:
            raise ValueError(f"Invalid path: {abs_dir} contains forbidden directory names 'backend' or 'build'.")

    if not abs_dir.startswith(abs_allowed_dir):
        raise ValueError(f"Invalid path: {abs_dir} is outside the allowed root directory.")

    return os.path.normpath(os.path.expanduser(path))

# Test Cases
def test_sanitize_path():
    test_cases = [
        # Valid paths
        ("~/projects/test/backend.zip", True),  # valid file path
        ("~/projects/test/folder/file.zip", True),  # valid file path
        ("~/projects/test/folder/valid.zip", True),  # valid file path
        ("~/projects/test/backend", False),  # path contains 'backend' (as folder)


        # Invalid paths
        ("~/projects/test/../../etc/passwd", False),  # outside allowed root (.. is used)
        ("~/projects/test/./folder.zip", False),  # contains '.'
        ("~/projects/backend.zip", True),  # path contains 'backend' (as file)
        ("~/projects/test/build", False),  # path contains 'build' folder
        ("~/projects/test/folder/invalid.txt", False),  # invalid file type
    ]

    for path, expected_valid in test_cases:
        is_valid = True
        try:
            sanitized = sanitize_path(path)
        except ValueError as e:
            is_valid = False
        assert is_valid == expected_valid


# Run the tests
test_sanitize_path()