import subprocess
from dotenv import load_dotenv
load_dotenv(".env")

if __name__ == "__main__":
    # Copy the .env file first
    p = subprocess.Popen("cp .env ./frontend/.env", shell=True)
    p.wait()

    # Run uvicorn with reload flag via subprocess
    subprocess.run([
        "uvicorn",
        "backend.api:app",
        "--host", "0.0.0.0",
        "--port", "8003",
        "--reload"
    ])