import os
import bcrypt
import requests
from getpass import getpass
from server_settings import SALT

class DeploymentClient:
    def __init__(self, host="147.182.240.53", port=80, server_pwd = "", pwd_salt = None):
        self.set_base_url(host, port)
        self.server_pwd = self.hash_password(server_pwd, pwd_salt)
        self.proxies = None#{"http": None, "https": None}
        self.pwd_salt = pwd_salt

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
        self._print_response("Stop Server", response)

    def start_server(self, script_path):
        url = self.base_url + "start_server/"
        data = {
            "password": self.server_pwd,
            "script_path": script_path
        }
        response = requests.post(url, json=data, proxies=self.proxies)
        self._print_response("Start Server", response)

    def unzip(self, path):
        url = self.base_url + "unzip/"
        data = {
            "password": self.server_pwd,
            "path": path
        }
        response = requests.post(url, json=data, proxies=self.proxies)
        self._print_response("Unzip", response)

    def clean_up(self, path):
        url = self.base_url + "clean_up/"
        data = {
            "password": self.server_pwd,
            "path": path
        }
        response = requests.post(url, json=data, proxies=self.proxies)
        self._print_response("Clean_up", response)

    def transfer(self, path, test_file):
        url = self.base_url + "transfer/"

        with open(test_file, "rb") as file_data:
            files = {
                "file": ("test_transfer.zip", file_data, "application/zip")
            }
            data = {"password": self.server_pwd, "path": path}
            response = requests.post(url, data=data, files=files, proxies=self.proxies)
            self._print_response("Transfer", response)

if __name__ == "__main__":
    server_pwd = getpass("Enter password: ")
    client = DeploymentClient(host="147.182.240.53", port=80, server_pwd = server_pwd, pwd_salt = SALT)

    # Test values
    client.stop_server()
    client.start_server("~/projects/humusmonitor/run.sh")
    client.clean_up("~/projects/testdir/test_transfer.zip")
    client.transfer("~/projects/testdir/test_transfer.zip", "./test_transfer.zip")
    client.unzip("~/projects/testdir/test_transfer.zip")