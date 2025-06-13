from fastapi import FastAPI, Body, Depends, Request

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from fastapi import FastAPI, HTTPException
from backend.model import UserSchema, UserLoginSchema
from backend.auth.auth_bearer import JWTBearer
from backend.auth.rate_limiter import RateLimiter
from backend.auth.auth_handler import signJWT, encodeJWT, verifyJWT, decodeJWT
import backend.database
from backend.database import *
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from fastapi import Body
import requests
import json 
import os
from fastapi import Response
from fastapi.responses import JSONResponse
import re

#Email stuff
import smtplib
from email.mime.text import MIMEText
import secrets

DEBUG = True

#Recaptcha stuff
recaptcha_url = 'https://www.google.com/recaptcha/api/siteverify'
recaptcha_secret_key = os.environ["SITE_SECRET"]

# Password for GMAIL
GMAIL_PWD = os.environ["GMAIL_PWD"]

app = FastAPI()

origins = ["*"]#Must be used with reverseproxy to prevent cors request in deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

########################## USER MANAGEMENT ####################
@app.get("/user/list_all", dependencies=[Depends(JWTBearer([{"role":"admin"}]))], tags=["user_management"])
async def users_list():
    return await get_users_db()
        
def send_gmail(subject, body, sender, recipients, password):
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = sender
    msg['To'] = ', '.join(recipients)
    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp_server:
       smtp_server.login(sender, password)
       smtp_server.sendmail(sender, recipients, msg.as_string())

@app.post("/user/send_sign_up_mail", tags=["user_management"])
async def send_signup_mail(request: Request):
    json = await request.json()

    if not DEBUG:
        response = requests.post(url = recaptcha_url, data = {'secret': recaptcha_secret_key, 'response': json["captchaValue"]}).json()
        if not response["success"]:
            raise HTTPException(status_code=401, detail=response)

    base_url = str('https://{uri.netloc}/'.format(uri=request.url))
    #access_token = secrets.token_urlsafe(30*3//4)
    #sign_up_token = access_token + "&" + email
    #sign_up_tokens.append(sign_up_token)

    user = {"email":json["email"], "role":"sign_up"}
    sign_up_token = encodeJWT(user)
    slug = "new_pwd_redirect?access_token=" + sign_up_token#new_pwd_token + "&email=" + email.replace("@", "%40")
    signup_url = base_url + slug

    subject = "Signup to coworkingfriendly.com"
    body = "To complete registration and set your account password use this link:\n" + signup_url + "\n Cheers and have fun!"
    sender = "hordeum.berlin@gmail.com"
    recipients = [json["email"]]

    send_gmail(subject, body, sender, recipients, GMAIL_PWD)
    return JSONResponse({})

@app.get("/new_pwd_redirect", tags=["user_management"])
def new_pwd_redirect(access_token: str = ""):
    """ Sets cookies and redirects to SettingsPage """
    rr = RedirectResponse('registration', status_code=303)
    set_http_only_cookie(rr, key="access_token", value=access_token)
    return rr

@app.get("/user/details", dependencies=[Depends(JWTBearer([{"role":"sign_up"},{"role":"user"},{"role":"admin"}]))], tags=["user_management"])
def user_details(request: Request):
    return decodeJWT(request.cookies["access_token"], True)

def validate_password(pw):
    return bool(re.search(r'[A-Z]', pw)) and \
           bool(re.search(r'[a-z]', pw)) and \
           bool(re.search(r'[0-9]', pw)) and \
           bool(re.search(r'[^A-Za-z0-9]', pw)) and \
           len(pw) > 8

@app.post("/user/change_password", tags=["user_management"])
async def change_password(request: Request, data: UserLoginSchema):
    data = data.dict()
    access_token: str = request.cookies.get("access_token")
    email = decodeJWT(access_token, True)["email"]
    #sign_up_token = access_token + "&" + email
    #if not sign_up_token in sign_up_tokens:
    #    raise HTTPException(status_code=401, detail="Sign up token invalid.")
    if not verifyJWT(access_token, {}, ignore_expiration = True):
        raise HTTPException(status_code=401, detail="Access token invalid.")
    if not validate_password(data["password"]):
        raise HTTPException(status_code, 400, detail="Password does not meet requirements.")
    if not "username" in data.keys():
        data["username"] = ""
    data["role"] = "user"
    data["email"] = email
    user = await add_user_db(data)
    response = JSONResponse(user)#Sign in user
    access_token = signJWT(user)["access_token"]
    set_http_only_cookie(response, "access_token", access_token)
    return response

def set_http_only_cookie(response, key, value):
    """ Sets hhtp.only cookie (readable by backend only and thus invulnerable to XSS attacks). 
        To make sure XSRF attacks are not possible in production same-site cookies must be used and they should be transferred securely"""
    if not DEBUG:
        response.set_cookie(key=key, value=value, httponly=True, secure=True, samesite="strict")
    else:
        response.set_cookie(key=key, value=value, httponly=True)

@app.get("/user/api_token", tags=["user_management"])
async def api_token(request: Request):
    access_token = signJWT({"version":"0.0.1"})["access_token"]
    return access_token

# Path where your tiles are stored
TILE_DIR = "./backend/tiles"

@app.get("/tiles/{z}/{x}/{y}.jpg", tags=["tiles"])
async def get_tile(z: int, x: int, y: int):
    #return JSONResponse({"dir": str(os.listdir("./backend/tiles"))})
    # Modulo logic for zoom level 0 (10x10 grid)
    if z == 0:
        x = x % 10
        y = y % 10

    tile_path = os.path.join(TILE_DIR, str(z), str(x), f"{y}.jpg")

    if not os.path.isfile(tile_path):
        raise HTTPException(status_code=404, detail="Tile not found")

    return FileResponse(tile_path, media_type="image/jpeg")


@app.get("/user/logout", tags=["user_management"])
async def logout(request: Request, response: Response):
    response = JSONResponse({})
    for k in request.cookies.keys():
        response.delete_cookie(k)
    return response

@app.post("/user/login", tags=["user_management"])
async def user_login(request: Request, user: UserLoginSchema):
    json = await request.json()
    if not DEBUG:
        response = requests.post(url = recaptcha_url, data = {'secret': recaptcha_secret_key, 'response': json["captchaValue"]}).json()
        if not response["success"]:
            raise HTTPException(status_code=429, detail="ReCaptcha Failed")
    if await verify_user_db(user):
        response = JSONResponse(content={})
        user = dict(user)
        access_token = signJWT(user)["access_token"]
        #response.set_cookie(key="access_token",value=f"Bearer {access_token}", httponly=True) #TODO set secure=true, "SameSite" to "Strict", max_age etc.
        set_http_only_cookie(response, "access_token", access_token)
        return response
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.delete("/user/delete_all", dependencies=[Depends(JWTBearer([{"role":"admin"}]))], tags=["user_management"])
async def delete_all_users():
    return await delete_all_users_db()

######################## STATIC FILES #########################
@app.get("{full_path:path}", tags=["static_files_frontend"])
async def catch_all(request: Request, full_path: str):
    directory="frontend/build/"
    full_path = directory + full_path
    if os.path.isfile(full_path):
        return FileResponse(full_path)
    else:
        full_path = directory+"index.html"
        return FileResponse(full_path)