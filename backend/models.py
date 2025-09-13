from sqlalchemy import Column, Integer, String, Float, Text, Date, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from db import Base

try:
    JSONType = JSONB
except:
    from sqlalchemy import JSON as JSONType

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

class Profile(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), default="You")
    conditions = Column(JSONType, default=list)
    preferences = Column(JSONType, default=dict)  # {vegan, vegetarian, nut_free, dislikes[]}
    calories_target = Column(Integer, default=2000)
    user = relationship("User")

class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    barcode = Column(String(64))
    location = Column(String(16), nullable=False)  # fridge/freezer/pantry
    quantity = Column(Float, default=1.0)
    unit = Column(String(32), default="pcs")
    calories_per_unit = Column(Float)
    expires_on = Column(Date)
    sustainability_score = Column(Integer, default=50)
    health_tags = Column(JSONType, default=list)
