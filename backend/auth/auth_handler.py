import time
from typing import Dict

import jwt
#from decouple import config
import os

JWT_SECRET = os.environ["secret"]#config("secret")
JWT_ALGORITHM = os.environ["algorithm"]#config("algorithm")

def token_response(token: str):
    return {
        "access_token": token
    }

def encodeJWT(payload: dict) -> Dict[str, str]:  
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token

def signJWT(payload: dict) -> Dict[str, str]:    
    payload["expires"] = time.time() + 600
    if "password" in payload.keys():
        del payload["password"]
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token_response(token)


def decodeJWT(token: str, ignore_expiration: bool) -> dict:
    try:
        decoded_token = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if ignore_expiration:
            return decoded_token
        return decoded_token if decoded_token["expires"] >= time.time() else None
    except:
        return {}

def verifyJWT(jwtoken: str, condition : dict, ignore_expiration: False) -> bool:
    isTokenValid: bool = False
    try:
        payload = decodeJWT(jwtoken, ignore_expiration = ignore_expiration)
        for k, v in condition.items():#if additional e.g. admin required
            assert payload[k] == v
    except:
        payload = None
    if payload:
        isTokenValid = True
    return isTokenValid