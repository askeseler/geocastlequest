from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from fastapi import Query

class UserSchema(BaseModel):
    username: str = Field(...)
    email: EmailStr = Field(...)
    role: str = Field(...)
    password: str = Field(...)

    class Config:
        schema_extra = {
            "example": {
                "username": "Michael",
                "email": "michael@x.com",
                "password": "weakpassword",
                "role": "admin"
            }
        }

class UserLoginSchema(BaseModel):
    email: EmailStr = Field(...)
    password: str = Field(...)

    class Config:
        schema_extra = {
            "example": {
                "email": "michael@x.com",
                "password": "weakpassword",
            }
        }