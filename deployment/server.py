import os
import bcrypt
import subprocess
import argparse
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from getpass import getpass
from server_settings import SALT
import base64

# Constants
SAFE_PORTS = [8000, 8001, 8002]
ALLOWED_DIR = os.path.expanduser("~/projects")

# FastAPI application
app = FastAPI()
PWD = None
file_id_to_chunks = {}

# --- Utility Functions ---

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
        if not (filename.endswith("build.zip") or filename.endswith("backend.zip")):
            raise ValueError(f"You can only copy build.zip or backend.zip")
        
    if filename.endswith(".sh"):
        if '/backend/' in abs_dir or '/build/' in abs_dir:
            raise ValueError(f"Invalid path: {abs_dir} contains forbidden directory names 'backend' or 'build'.")

    if not abs_dir.startswith(abs_allowed_dir):
        raise ValueError(f"Invalid path: {abs_dir} is outside the allowed root directory.")

    return os.path.normpath(os.path.expanduser(path))

def sanitize_port(port: int) -> int:
    if port not in SAFE_PORTS:
        raise ValueError(f"Port {port} is not allowed. Use one of {SAFE_PORTS}")
    return port

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), SALT.encode("utf-8")).decode()

def verify_password(provided: str) -> bool:
    global PWD
    return PWD == provided

def run_command(command: str) -> bool:
    print(command)
    try:
        process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate()
        if process.returncode == 0:
            print(stdout)
            return True
        else:
            print(f"Command failed with error: {stderr.decode()}")
            return False
    except Exception as e:
        print(f"Error executing command: {str(e)}")
        return False

# --- Request Models ---

class StartServerRequest(BaseModel):
    script_path: str
    password: str

class StopServerRequest(BaseModel):
    port: int
    password: str

class CleanUpRequest(BaseModel):
    path: str
    password: str

class ChunkedTransferRequest(BaseModel):
    path: str
    password: str
    file_id: str
    chunk_idx: int  # -1 means final chunk
    data: str       # base64-encoded chunk

class UnzipRequest(BaseModel):
    path: str
    password: str

# --- API Endpoints ---

@app.get("/api/deployment/isalive/")
async def isalive():
    return {"alive": True}

@app.post("/api/deployment/start_server/")
async def start_server(request: StartServerRequest):
    try:
        if not verify_password(request.password):
            raise HTTPException(status_code=403, detail="Invalid password")
        path = sanitize_path(request.script_path)
        basepath, filename = os.path.split(os.path.expanduser(path))
        command = f"cd {basepath} && bash {filename}"
        if run_command(command):
            return {"status": "success", "message": f"Server started with script {path}"}
        raise HTTPException(status_code=500, detail="Failed to start server")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/deployment/stop_server/")
async def stop_server(request: StopServerRequest):
    try:
        if not verify_password(request.password):
            raise HTTPException(status_code=403, detail="Invalid password")
        port = sanitize_port(request.port)
        if run_command(f"fuser -k {port}/tcp"):
            return {"status": "success", "message": f"Server stopped at port {port}"}
        raise HTTPException(status_code=500, detail="Failed to stop server")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/deployment/clean_up/")
async def clean_up(request: CleanUpRequest):
    try:
        if not verify_password(request.password):
            raise HTTPException(status_code=403, detail="Invalid password")
        path = sanitize_path(request.path)
        if run_command(f"rm -rf {path}"):
            return {"status": "success", "message": f"Cleaned up path: {path}"}
        raise HTTPException(status_code=500, detail="Failed to clean up")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/deployment/transfer/")
async def transfer(path: str = Form(...), password: str = Form(...), file: UploadFile = File(...)):
    try:
        if not verify_password(password):
            raise HTTPException(status_code=403, detail="Invalid password")
        full_path = sanitize_path(path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as buffer:
            buffer.write(await file.read())

        print(full_path)
        assert os.path.isfile(full_path)
        return {"status": "success", "message": f"File saved to {full_path}"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/deployment/transfer_base64/")
async def transfer_base64_chunked(req: ChunkedTransferRequest):
    try:
        if not verify_password(req.password):
            raise HTTPException(status_code=403, detail="Invalid password")

        if req.chunk_idx != -1:
            # Store the chunk
            file_id_to_chunks.setdefault(req.file_id, []).append(req.data)
            return {"continue": True}
        else:
            # Final chunk received — process complete file
            if req.file_id not in file_id_to_chunks:
                raise HTTPException(status_code=400, detail="No chunks received for this file_id")

            all_chunks = file_id_to_chunks.pop(req.file_id)
            all_chunks.append(req.data)  # Append final chunk

            # Combine all chunks
            base64_data = ''.join(all_chunks)
            decoded_data = base64.b64decode(base64_data)

            # Write to disk
            full_path = sanitize_path(req.path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "wb") as f:
                f.write(decoded_data)

            return {"status": "success", "message": f"File saved to {full_path}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/deployment/unzip/")
async def unzip(request: UnzipRequest):
    try:
        if not verify_password(request.password):
            raise HTTPException(status_code=403, detail="Invalid password")
        path = sanitize_path(request.path)
        unzip_dir = os.path.dirname(path)
        if run_command(f'cd {unzip_dir} && unzip -o {os.path.basename(path)}'):
            return {"status": "success", "message": f"Unzipped file at {path}"}
        raise HTTPException(status_code=500, detail="Failed to unzip file")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Server Start Logic ---

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Start the FastAPI server with password protection.")
    parser.add_argument("--port", type=int, default=80, help="Port to start the server on (default: 80)")
    parser.add_argument("--password", type=str, help="Password for server access")
    parser.add_argument("--detach", type=bool, default=True, help="Detach process such that it runs after SSH session ends")
    args = parser.parse_args()

    if args.password is None:
        password = getpass(prompt="Enter the server password: ")
        hashed_pwd = hash_password(password)
        port = args.port
        command = f"python server.py --password '{hashed_pwd}' --port {port}"
        print(f"Launching: {command}")
        if args.detach:
            subprocess.Popen(f"nohup {command} > out.log 2>&1 &", shell=True, preexec_fn=os.setpgrp)
        else:
            subprocess.Popen(command, shell=True)
    else:
        PWD = args.password
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=args.port)
