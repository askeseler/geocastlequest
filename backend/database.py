from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from fastapi import Query
import bcrypt#for pwd hashing
from decouple import config
import motor.motor_asyncio

pwd_salt = config("pwd_salt_str").encode()


MONGO_DETAILS = "mongodb://127.0.0.1:27017/?compressors=disabled&gssapiServiceName=mongodb"#config("MONGO_DETAILS")  # read environment variable

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_DETAILS)

database = client.geocastlequest
users = database.get_collection("user_collection")

##################### USER MANAGEMENT #################
def dbitem2user(data):
    item = {
        "email": data["_id"],
        "username": data["username"],
        "role": data["role"],
    }
    return item

def user2dbitem(data):
    data = dict(data)
    if not "username" in data.keys():
        data["username"] = ""
    if not "role" in data.keys():
        data["role"] = "user"
    item = {
        "role": data["role"],
        "username": data["username"],
        "_id": data["email"],
        "password": data["password"]
    }
    return item

# Add a new user into to the database
async def add_user_db(data: dict) -> dict:
    data = user2dbitem(data)
    data["password"] = bcrypt.hashpw(data["password"].encode(), pwd_salt)

    found = await users.find_one({"_id":data["_id"]})
    if not found:
        res = await users.insert_one(data)
        print(res)
    else:
        await users.replace_one(found, data)
    return dbitem2user(data)

async def verify_user_db(data: dict) -> bool:
    data = user2dbitem(data)
    password = bcrypt.hashpw(data["password"].encode(), pwd_salt)
    data = await users.find_one({"_id": data["_id"]})
    if data and password == data["password"]:
        return True
    else:
        return False

# Retrieve all items present in the database
async def get_users_db():
    items = []
    async for item in users.find():
        items.append(dbitem2user(item))
    return items

async def delete_all_users_db():
    await users.delete_many({})
    return {}