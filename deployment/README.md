# Deployment Aid: CI/CD tool
* A tool to deploy the code to a server using ssh or a custom deployment server *.

Run python deploy.py to start the program. Make sure you have PyQt5 and other required packages installed.

* The program makes the following assumptions *:
- There is a folder of your project that contains a /frontend and a /backend subdirectories.
- The /frontend folder is a ReactJS project that supports npm react-scripts build
- The server contains a folder pojects in root (~/projects)
- This projects folder contains your project folder on the backend side
- Your project folder contains a run.sh script
- Your project runs on a given port (e.g. 8002; This means you probably need a reverse proxy)

* The program featurs *:
- GUI based triggers for deployment steps or pipelines
- Automatically loaded settings
- SSH Mode (Execute commands remotely / copy files via ssh) or Deployment Server Mode (Run scripts via HTTP or transfer files)
- Windows and Unix support
- Separate pipelines for backend and frontend
- Four key features for deployment
    1. Build frontend using Npm
    2. Stop server
    3. Transfer files
    4. Start Server

* Usage and limitations *
- SSH only supported for Linux
- If you want to run the program in Deployment Server Mode
    - Define server_settings.py
    - Run server.py on the server
    - Enter Password
- In ssh mode Enter Username@IP in Server IP field
- No trailing slash in remote folder
