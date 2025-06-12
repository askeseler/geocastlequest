import sys
import json
from PyQt5 import QtWidgets
from UserInterface import Ui_MainWindow
import subprocess
from PyQt5.QtCore import QThread, pyqtSignal
import os
import platform
from PyQt5.QtWidgets import QMessageBox
import bcrypt
import requests
import base64
import uuid
from server_settings import SALT

class DeploymentClient:
    def __init__(self, host="147.182.240.53", port=80, server_pwd = "", pwd_salt = None):
        self.set_base_url(host, port)
        self.server_pwd = self.hash_password(server_pwd, pwd_salt)
        self.proxies = self.get_working_proxy()#{"http": None, "https": None}#None
        print(self.proxies)
        self.pwd_salt = pwd_salt

    def get_working_proxy(self, url="http://www.google.com", timeout=1):
        options = [
            {"http": None, "https": None},
            None
        ]
        for proxy in options:
            try:
                requests.get(url, proxies=proxy, timeout=timeout)
                return proxy
            except:
                continue
        print("WARNING: NO WORKING PROXY SETTING FOUND")
        return None

    def set_password(self, server_pwd):
        self.server_pwd = self.hash_password(server_pwd, self.pwd_salt)

    def set_base_url(self, host, port):
        if port == 443:
            self.base_url = f"https://{host}:{port}/api/deployment/"
        else:
            self.base_url = f"http://{host}:{port}/api/deployment/"

    def hash_password(self, password: str, salt: str) -> str:
        """
        Returns a deterministic bcrypt hash of the given password using a fixed salt.
        The salt must be 29 characters starting with '$2b$12$'.
        """
        if salt == None:
            return password
        if not salt.startswith("$2b$12$") or len(salt) != 29:
            raise ValueError("Salt must be a 29-character bcrypt salt starting with '$2b$12$'")

        hashed = bcrypt.hashpw(password.encode("utf-8"), salt.encode("utf-8")).decode()
        return hashed

    def _print_response(self, label, response, command_line=True):
        response_string = f"--- {label} ---\n"
        response_string += f"Status Code: {response.status_code}\n"
        
        try:
            response_string += f"Response: {response.json()}\n"
        except Exception:
            response_string += f"Raw Response: {response.text}\n"
        
        if command_line:
            print(response_string)

        return response_string

    def stop_server(self, port=8002):
        url = self.base_url + "stop_server/"
        data = {
            "password": self.server_pwd,
            "port": port
        }
        response = requests.post(url, json=data, proxies=self.proxies)
        return self._print_response("Stop Server", response)

    def start_server(self, script_path):
        url = self.base_url + "start_server/"
        data = {
            "password": self.server_pwd,
            "script_path": script_path
        }
        response = requests.post(url, json=data, proxies=self.proxies)
        return self._print_response("Start Server", response)

    def unzip(self, path):
        url = self.base_url + "unzip/"
        data = {
            "password": self.server_pwd,
            "path": path
        }
        response = requests.post(url, json=data, proxies=self.proxies)
        return self._print_response("Unzip", response)

    def clean_up(self, path):
        url = self.base_url + "clean_up/"
        data = {
            "password": self.server_pwd,
            "path": path
        }
        response = requests.post(url, json=data, proxies=self.proxies)
        return self._print_response("Clean_up", response)

    def transfer(self, path, test_file, mode="base64"):
        if mode == "multipart":
            return self.transfer_multipart(path, test_file)
        elif mode == "base64":
            return self.transfer_base64_chunked(path, test_file)

    def transfer_multipart(self, path, test_file):
        url = self.base_url + "transfer/"

        with open(test_file, "rb") as file_data:
            files = {
                "file": ("file_transfer.zip", file_data, "application/zip")
            }
            data = {"password": self.server_pwd, "path": path}
            response = requests.post(url, data=data, files=files, proxies=self.proxies)
            return self._print_response("Transfer Multipart", response)

    def transfer_base64_chunked(self, path, test_file, chunk_size=100000):
        url = self.base_url + "transfer_base64/"
        file_id = str(uuid.uuid4())

        with open(test_file, "rb") as file_data:
            encoded = base64.b64encode(file_data.read()).decode("utf-8")

        chunks = [encoded[i:i + chunk_size] for i in range(0, len(encoded), chunk_size)]

        for idx, chunk in enumerate(chunks):
            print(path)
            data = {
                "password": self.server_pwd,
                "path": path,
                "file_id": file_id,
                "chunk_idx": idx,
                "data": chunk
            }
            response = requests.post(url, json=data, proxies=self.proxies)
            if not response.ok or not response.json().get("continue", True):
                return self._print_response(f"Chunk {idx} Failed", response)

        # Finalizing upload with chunk_idx = -1
        data = {
            "password": self.server_pwd,
            "path": path,
            "file_id": file_id,
            "chunk_idx": -1,
            "data": ""  # no more data, just final signal
        }
        response = requests.post(url, json=data, proxies=self.proxies)
        return self._print_response("Transfer Base64 Final", response)

class RunCommandThread(QThread):
    output = pyqtSignal(str)
    finished = pyqtSignal(int)

    def __init__(self, command=""):
        super().__init__()
        self.command = command

    def set_command(self, command):
        self.command = command

    def run(self):
        process = subprocess.Popen(
            self.command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        if process.stdout:
            for line in process.stdout:
                self.output.emit(f"[stdout] {line.rstrip()}")

        if process.stderr:
            for line in process.stderr:
                self.output.emit(f"[stderr] {line.rstrip()}")

        process.wait()
        self.output.emit(f"\n[exit code] {process.returncode}")
        self.finished.emit(process.returncode)

class Deployment:
    def __init__(self, ui, os_type):
        self.ui = ui
        self.os = os_type
        self.deployment_client = DeploymentClient(host = self.ui.server_ip.text().split("@")[0], 
                                                  port = 80, server_pwd = self.ui.password.text(),
                                                  pwd_salt=SALT)#For http based deployment
        self.t_stop_server = RunCommandThread()
        self.t_start_server = RunCommandThread()

    def alert(self, message):
        msg = QMessageBox()
        msg.setWindowTitle("Alert")
        msg.setText(message)
        msg.setIcon(QMessageBox.Warning)
        msg.setStandardButtons(QMessageBox.Ok)
        msg.exec_()

    def get_mode(self):
        if self.ui.use_ssh.isChecked():
            return "ssh"
        elif self.ui.use_deployment_server.isChecked():
            return "deployment_server"
        raise ValueError("No mode selected")
    
    def log_command(self, command, password=None):
        if password:
            command = command.replace(password, "*********")
        self.ui.logs.append(f"Running: {command}")
        print(f"Running: {command}")

    def stop_server(self):
        if self.get_mode() == "ssh":
            if self.os == "windows":
                self.alert("SSH is currently not supported on Windows.")
                return
            password = self.ui.password.text()
            server_ip = self.ui.server_ip.text()
            command = f"sshpass -p {password} ssh {server_ip} 'fuser -k {self.ui.server_port.text()}/tcp'"
            self.log_command(command, password)
            self.t_stop_server.set_command(command)
            self.t_stop_server.start()
        elif self.get_mode() == "deployment_server":
            response = self.deployment_client.stop_server(self.ui.server_port.text())
            self.ui.logs.append(response)
            self.t_stop_server.set_command("\n")
            self.t_stop_server.start()

    def start_server(self):
        if self.get_mode() == "ssh":
            if self.os == "windows":
                self.alert("SSH is currently not supported on Windows.")
                return
            password = self.ui.password.text()
            server_ip = self.ui.server_ip.text()
            remote_folder = self.ui.remote_folder.text()
            command = (
                f"sshpass -p '{password}' ssh {server_ip} "
                f"\"source /root/miniconda3/etc/profile.d/conda.sh && "
                f"conda activate socialmediahub && cd {remote_folder} && bash run.sh\""
            )
            self.log_command(command, password)
            self.t_start_server.set_command(command)
            self.t_start_server.start()
        elif self.get_mode() == "deployment_server":
            response = self.deployment_client.start_server(self.ui.remote_folder.text() + "/run.sh")
            self.ui.logs.append(response)    

class FrontendDeployment(Deployment):
    def __init__(self, ui, os_type):
        super().__init__(ui, os_type)
        self.t_run_build = RunCommandThread()
        self.t_zip_files = RunCommandThread()
        self.t_clean_up = RunCommandThread()
        self.t_transfer = RunCommandThread()
        self.t_unzip = RunCommandThread()

    def run_build(self):
        frontend_dir = os.path.join(self.ui.local_folder.text(), 'frontend')
        command = f"cd {frontend_dir} && npm run-script build"
        self.log_command(command)
        self.t_run_build.set_command(command)
        self.t_run_build.start()

    def zip_files(self):
        folder = os.path.join(self.ui.local_folder.text(), 'frontend')
        if self.os == "windows":
            command = f"cd {folder} && tar.exe -a -c -f build.zip build"
        else:
            command = f"cd {folder} && zip -r build.zip build"
        self.log_command(command)
        self.t_zip_files.set_command(command)
        self.t_zip_files.start()

    def clean_up(self):
        password = self.ui.password.text()
        server_ip = self.ui.server_ip.text()
        local_folder = self.ui.local_folder.text() + "frontend/"
        remote_folder = self.ui.remote_folder.text() + "frontend/"

        if self.get_mode() == "ssh" and self.os != "windows":
            command = (
                f"sshpass -p '{password}' scp {local_folder}build.zip {server_ip}:{remote_folder}"
            )
            self.log_command(command, password)  # Log the command with password masking
            self.t_clean_up.set_command(command)
            self.t_clean_up.start()
        elif self.get_mode() == "deployment_server":
            response = self.deployment_client.clean_up(f"{remote_folder}/build.zip")
            self.ui.logs.append(response)
            self.t_clean_up.set_command("\n")
            self.t_clean_up.start()

    def transfer(self):
        password = self.ui.password.text()
        server_ip = self.ui.server_ip.text()
        local_folder = os.path.join(self.ui.local_folder.text(), 'frontend')
        remote_folder = self.ui.remote_folder.text()
        if self.get_mode() == "ssh" and self.os != "windows":
            command = f"sshpass -p '{password}' scp {local_folder}build.zip {server_ip}:{remote_folder}"
            self.log_command(command, password)
            self.t_transfer.set_command(command)
            self.t_transfer.start()
        elif self.get_mode() == "deployment_server":
            response = self.deployment_client.transfer(f"{remote_folder}/frontend/build.zip", f"{local_folder}/build.zip")
            self.ui.logs.append(response)
            self.t_transfer.set_command("\n")
            self.t_transfer.start()

    def unzip(self):
        password = self.ui.password.text()
        server_ip = self.ui.server_ip.text()
        remote_folder = self.ui.remote_folder.text() + "/frontend"
        if self.get_mode() == "ssh" and self.os != "windows":
            command = (
                f"sshpass -p '{password}' ssh {server_ip} "
                f"\"cd {remote_folder} && unzip -o build.zip\""
            )
            self.log_command(command, password)  # Log the command with password masking
            self.t_unzip.set_command(command)
            self.t_unzip.start()
        elif self.get_mode() == "deployment_server":
            response = self.deployment_client.unzip(f"{remote_folder}/build.zip")
            self.ui.logs.append(response)
            self.t_unzip.set_command("\n")
            self.t_unzip.start()

    def deploy(self):
        print("Starting frontend deployment...")

        def on_step_finished(next_step):
            log = self.ui.logs.toPlainText().strip().splitlines()
            last_line = log[-1] if log else ""
            if last_line.startswith("[exit code]") and "[exit code] 0" in last_line:
                next_step()
            else:
                self.ui.logs.append("Pipeline interrupted!")

        self.t_run_build.finished.connect(lambda: on_step_finished(self.stop_server))
        self.t_stop_server.finished.connect(lambda: on_step_finished(self.zip_files))
        self.t_zip_files.finished.connect(lambda: on_step_finished(self.clean_up))
        self.t_clean_up.finished.connect(lambda: on_step_finished(self.transfer))
        self.t_transfer.finished.connect(lambda: on_step_finished(self.unzip))
        self.t_unzip.finished.connect(lambda: on_step_finished(self.start_server))
        self.t_start_server.finished.connect(lambda: print("Frontend deployment completed."))

        self.run_build()


class BackendDeployment(Deployment):
    def __init__(self, ui, os_type):
        super().__init__(ui, os_type)
        self.t_zip_files = RunCommandThread()
        self.t_clean_up = RunCommandThread()
        self.t_transfer = RunCommandThread()
        self.t_unzip = RunCommandThread()

    def zip_files(self):
        folder = self.ui.local_folder.text()
        if self.os == "windows":
            command = f"cd {folder} && tar.exe -a -c -f backend.zip backend"
        else:
            command = f"cd {folder} && zip -r backend.zip backend"
        self.log_command(command)
        self.t_zip_files.set_command(command)
        self.t_zip_files.start()

    def clean_up(self):
        password = self.ui.password.text()
        server_ip = self.ui.server_ip.text()
        remote_folder = self.ui.remote_folder.text()
        if self.get_mode() == "ssh" and self.os != "windows":
            command = f"sshpass -p '{password}' ssh {server_ip} \"cd {remote_folder} && rm -rf backend backend.zip\""
            self.log_command(command, password)
            self.t_clean_up.set_command(command)
            self.t_clean_up.start()
        elif self.get_mode() == "deployment_server":
            response = self.deployment_client.clean_up(f"{remote_folder}/backend.zip")
            self.ui.logs.append(response)
            self.t_clean_up.set_command("\n")
            self.t_clean_up.start()

    def transfer(self):
        password = self.ui.password.text()
        server_ip = self.ui.server_ip.text()
        local_folder = self.ui.local_folder.text()
        remote_folder = self.ui.remote_folder.text()
        if self.get_mode() == "ssh" and self.os != "windows":
            command = f"sshpass -p '{password}' scp {local_folder}backend.zip {server_ip}:{remote_folder}"
            self.log_command(command, password)
            self.t_transfer.set_command(command)
            self.t_transfer.start()
        elif self.get_mode() == "deployment_server":
            response = self.deployment_client.transfer(f"{remote_folder}/backend.zip", f"{local_folder}/backend.zip")
            self.ui.logs.append(response)
            self.t_transfer.set_command("\n")
            self.t_transfer.start()

    def unzip(self):
        password = self.ui.password.text()
        server_ip = self.ui.server_ip.text()
        remote_folder = self.ui.remote_folder.text()
        if self.get_mode() == "ssh" and self.os != "windows":
            command = f"sshpass -p '{password}' ssh {server_ip} \"cd {remote_folder} && unzip -o backend.zip\""
            self.log_command(command, password)
            self.t_unzip.set_command(command)
            self.t_unzip.start()
        elif self.get_mode() == "deployment_server":
            response = self.deployment_client.unzip(f"{remote_folder}/backend.zip")
            self.ui.logs.append(response)
            self.t_unzip.set_command("\n")
            self.t_unzip.start()

    def deploy(self):
        print("Starting backend deployment...")

        def on_step_finished(next_step):
            log = self.ui.logs.toPlainText().strip().splitlines()
            last_line = log[-1] if log else ""
            if last_line.startswith("[exit code]") and "[exit code] 0" in last_line:
                next_step()
            else:
                self.ui.logs.append("Pipeline interrupted!")

        self.t_stop_server.finished.connect(lambda: on_step_finished(self.zip_files))
        self.t_zip_files.finished.connect(lambda: on_step_finished(self.clean_up))
        self.t_clean_up.finished.connect(lambda: on_step_finished(self.transfer))
        self.t_transfer.finished.connect(lambda: on_step_finished(self.unzip))
        self.t_unzip.finished.connect(lambda: on_step_finished(self.start_server))
        self.t_start_server.finished.connect(lambda: print("Backend deployment completed."))

        self.stop_server()


class App:
    def __init__(self, centalWidget, ui):
        self.ui = ui
        self.centalWidget = centalWidget

        self.last_pressed_button = None  # Track the last clicked button
        self.settings = None

        # Create deployment instances with clear names
        self.set_os()
        self.load_settings()
        self.load_settings_into_ui()

        self.backend_deployment = BackendDeployment(ui, self.os)
        self.frontend_deployment = FrontendDeployment(ui, self.os)


        self.make_connections()

    def alert(self, message):
        """Shows an alert with a message."""
        msg = QMessageBox()
        msg.setWindowTitle("Alert")
        msg.setText(message)
        msg.setIcon(QMessageBox.Warning)  # Or other icons like Information, Critical, etc.
        msg.setStandardButtons(QMessageBox.Ok)
        msg.exec_()

    def get_mode(self):
        if self.ui.use_ssh.isChecked():
            return "ssh"
        elif self.ui.use_deployment_server.isChecked():
            return "deployment_server"
        raise ValueError("No mode selected: Please select either SSH or Deployment Server.")

    def load_settings_into_ui(self, selected_key=None):
        """Populate config dropdown and load selected config into UI."""
        self.ui.config_dropdown.blockSignals(True)  # Block signals during UI update

        self.ui.config_dropdown.clear()
        self.ui.config_dropdown.addItems(self.settings.keys())

        selected_key = selected_key or ("Default" if "Default" in self.settings else next(iter(self.settings), None))
        if not selected_key:
            self.ui.config_dropdown.blockSignals(False)
            return  # No config available

        config = self.settings[selected_key]
        self.ui.config_dropdown.setCurrentText(selected_key)
        self.ui.config_name.setText(selected_key)

        self.ui.server_ip.setText(config.get("server_ip", ""))
        self.ui.remote_folder.setText(config.get("remote_folder", ""))
        self.ui.local_folder.setText(config.get("local_folder", ""))
        self.ui.port.setText(str(config.get("port", 22)))
        self.ui.server_port.setText(str(config.get("server_port", 8002)))

        mode = config.get("mode", "ssh")
        self.ui.use_ssh.setChecked(mode == "ssh")
        self.ui.use_deployment_server.setChecked(mode == "deployment_server")

        self.ui.config_dropdown.blockSignals(False)  # Re-enable signals after update


    def on_config_selected(self, config_name):
        """Triggered when the user selects a different configuration."""
        self.load_settings_into_ui(config_name)

    def delete_config(self):
        """Deletes a configuration by name, except for 'Default'."""
        name = self.ui.config_name.text().strip()
        if name == "Default":
            self.alert("The 'Default' configuration cannot be deleted.")
            return

        if name in self.settings:
            del self.settings[name]
            self.save_settings_to_file()
            self.alert(f"Configuration '{name}' deleted.")
            self.load_settings_into_ui()
        else:
            self.alert(f"No configuration named '{name}' found.")

    def save_settings_to_file(self):
        """Writes current settings to settings.json."""
        try:
            with open("settings.json", "w") as f:
                json.dump(self.settings, f, indent=4)
        except Exception as e:
            self.alert(f"Error saving settings: {e}")

    def set_os(self):
        os_type = platform.system()
        if os_type == "Windows":
            self.os = "windows"
        elif os_type == "Linux":
            self.os = "linux"
        elif os_type == "Darwin":  # macOS reports as 'Darwin'
            self.os = "macos"
        else:
            self.os = "unknown"

    def highlight_button(self, button):
        # Reset the style of the last pressed button
        if self.last_pressed_button:
            self.last_pressed_button.setStyleSheet("")  # Reset the previous button style

        # Highlight the currently clicked button
        button.setStyleSheet("background-color: #a6d4fa; font-weight: bold;")
        self.last_pressed_button = button

    def append_log(self, text):
        self.ui.logs.append(text)
        self.ui.logs.verticalScrollBar().setValue(self.ui.logs.verticalScrollBar().maximum())

    def on_button_clicked(self, button, command):
        # Highlight the clicked button
        self.highlight_button(button)
        
        # Execute the command
        command()

    def make_connections(self):
        # Backend Deployment Buttons
        self.ui.stop_server_1.clicked.connect(lambda: self.on_button_clicked(self.ui.stop_server_1, self.frontend_deployment.stop_server))
        self.ui.zip_1.clicked.connect(lambda: self.on_button_clicked(self.ui.zip_1, self.backend_deployment.zip_files))
        self.ui.clean_up_1.clicked.connect(lambda: self.on_button_clicked(self.ui.clean_up_1, self.backend_deployment.clean_up))
        self.ui.transfer_1.clicked.connect(lambda: self.on_button_clicked(self.ui.transfer_1, self.backend_deployment.transfer))
        self.ui.unzip_1.clicked.connect(lambda: self.on_button_clicked(self.ui.unzip_1, self.backend_deployment.unzip))
        self.ui.start_server_1.clicked.connect(lambda: self.on_button_clicked(self.ui.start_server_1, self.backend_deployment.start_server))

        # Frontend Deployment Buttons
        self.ui.run_build.clicked.connect(lambda: self.on_button_clicked(self.ui.run_build, self.frontend_deployment.run_build))
        self.ui.stop_server_2.clicked.connect(lambda: self.on_button_clicked(self.ui.stop_server_2, self.frontend_deployment.stop_server))
        self.ui.zip_2.clicked.connect(lambda: self.on_button_clicked(self.ui.zip_2, self.frontend_deployment.zip_files))
        self.ui.clean_up_2.clicked.connect(lambda: self.on_button_clicked(self.ui.clean_up_2, self.frontend_deployment.clean_up))
        self.ui.transfer_2.clicked.connect(lambda: self.on_button_clicked(self.ui.transfer_2, self.frontend_deployment.transfer))
        self.ui.unzip_2.clicked.connect(lambda: self.on_button_clicked(self.ui.unzip_2, self.frontend_deployment.unzip))
        self.ui.start_server_2.clicked.connect(lambda: self.on_button_clicked(self.ui.start_server_2, self.frontend_deployment.start_server))

        # Deploy All Button
        self.ui.deploy_backend.clicked.connect(lambda: self.on_button_clicked(self.ui.deploy_backend, self.backend_deployment.deploy))
        self.ui.deploy_frontend.clicked.connect(lambda: self.on_button_clicked(self.ui.deploy_frontend, self.frontend_deployment.deploy))

        # Backend Deployment Threads
        self.backend_deployment.t_stop_server.output.connect(self.append_log)
        self.backend_deployment.t_zip_files.output.connect(self.append_log)
        self.backend_deployment.t_clean_up.output.connect(self.append_log)
        self.backend_deployment.t_transfer.output.connect(self.append_log)
        self.backend_deployment.t_unzip.output.connect(self.append_log)
        self.backend_deployment.t_start_server.output.connect(self.append_log)

        # Frontend Deployment Threads
        self.frontend_deployment.t_run_build.output.connect(self.append_log)
        self.frontend_deployment.t_stop_server.output.connect(self.append_log)
        self.frontend_deployment.t_zip_files.output.connect(self.append_log)
        self.frontend_deployment.t_clean_up.output.connect(self.append_log)
        self.frontend_deployment.t_transfer.output.connect(self.append_log)
        self.frontend_deployment.t_unzip.output.connect(self.append_log)
        self.frontend_deployment.t_start_server.output.connect(self.append_log)

        self.ui.config_dropdown.currentTextChanged.connect(self.on_config_selected)
        self.ui.save_config.clicked.connect(self.save_settings)
        self.ui.delete_config.clicked.connect(self.delete_config)

        # For deployment client
        self.ui.password.textChanged.connect(lambda password: self.frontend_deployment.deployment_client.set_password(password))
        self.ui.password.textChanged.connect(lambda password: self.backend_deployment.deployment_client.set_password(password))

        self.ui.server_ip.textChanged.connect(lambda server_ip: self.frontend_deployment.deployment_client.set_base_url(
            server_ip.split("@")[0], 80
        ))

        self.ui.server_ip.textChanged.connect(lambda server_ip: self.backend_deployment.deployment_client.set_base_url(
            server_ip.split("@")[0], 80
        ))

    def load_settings(self):
        """Loads settings.json into memory, ensures 'Default' exists."""
        try:
            with open("settings.json", "r") as f:
                self.settings = json.load(f)
        except Exception as e:
            self.alert(f"Error loading settings.json: {e}")
            self.settings = {}

        if "Default" not in self.settings:
            self.settings["Default"] = {
                "server_ip": "",
                "remote_folder": "",
                "local_folder": "",
                "mode" : "ssh",
                "port" : 22,
            }
            try:
                with open("settings.json", "w") as f:
                    json.dump(self.settings, f, indent=4)
            except Exception as e:
                self.alert(f"Error writing settings.json: {e}")

    def save_settings(self):
        """Saves current UI values as a config under the given name."""
        name = self.ui.config_name.text().strip()
        if not name:
            self.alert("Please enter a configuration name.")
            return

        self.settings[name] = {
            "server_ip": self.ui.server_ip.text(),
            "remote_folder": self.ui.remote_folder.text(),
            "local_folder": self.ui.local_folder.text(),
            "mode": self.get_mode(),
            "port": int(self.ui.port.text()) if self.ui.port.text().isdigit() else 22,
            "server_port": int(self.ui.server_port.text()) if self.ui.server_port.text().isdigit() else 8002,
        }

        self.save_settings_to_file()
        self.alert(f"Configuration '{name}' saved.")
        self.load_settings()
        self.load_settings_into_ui()

    def shut_down(self):
        self.save_settings_to_file()

class Main:
    def __init__(self):
        self.q_application = QtWidgets.QApplication(sys.argv)

        MainWindow = QtWidgets.QMainWindow()  # Create a window
        MainWindow.setWindowTitle("Deployment App")
        self.ui = Ui_MainWindow()  # Load the UI
        self.ui.setupUi(MainWindow)
        self.app = App(self.ui.centralwidget, self.ui)

        # MainWindow.show() and we show it directly
        MainWindow.show()

        self.q_application.exec_()
        self.app.shut_down()

    def make_connections(self):
        pass


if __name__ == "__main__":
    Main()
