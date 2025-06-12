import uvicorn
import subprocess
from dotenv import load_dotenv
load_dotenv(".env")

if __name__ == "__main__":
    p = subprocess.Popen("cp .env ./frontend/.env", shell = True)
    p.wait()
    uvicorn.run("backend.api:app", host="0.0.0.0", port=8003)