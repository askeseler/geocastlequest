from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import json
import numpy as np
from .auth_handler import decodeJWT, verifyJWT

class JWTBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True,  conditions = [{}], credentials_in_header = False):
        self.conditions = conditions
        self.credentials_in_header = credentials_in_header#otherwise expected to be in http only cookie
        super(JWTBearer, self).__init__(auto_error=auto_error)

    async def check_credentials_header(self, request: Request):
        credentials: HTTPAuthorizationCredentials = await super(JWTBearer, self).__call__(request)
        if credentials:
            if not credentials.scheme == "Bearer":
                raise HTTPException(status_code=403, detail="Invalid authentication scheme.")
        res = [verifyJWT(credentials.credentials, condition = condition, ignore_expiration=True) for condition in self.conditions]#todo dont ignore expiration time
        if not np.any(res):#at least one of the conditions must be met (e.g. "role"=="user")
            return credentials.credentials
        else:
            raise HTTPException(status_code=403, detail="Invalid authorization code.")

    def check_credentials_http_cookie(self, request: Request):
        if not "access_token" in request.cookies:
            raise HTTPException(status_code=403, detail="Invalid token or expired token. Cookie missing.")
        #access_token = json.loads(request.cookies.get("access_token").replace("'",'"'))["access_token"]#changed to accept access token from httpOnly Cookie
        access_token = request.cookies.get("access_token")
        res = [verifyJWT(access_token, condition = condition, ignore_expiration=True) for condition in self.conditions]#todo dont ignore expiration time
        if not np.any(res):#at least one of the conditions must be met (e.g. "role"=="user")
            raise HTTPException(status_code=403, detail="Invalid token or expired token. At least one of the conditions must be met.")
        return access_token

    async def __call__(self, request: Request):
        if self.credentials_in_header:
            return await self.check_credentials_header(request)
        else:
            return self.check_credentials_http_cookie(request)
