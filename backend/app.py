import os, json, datetime
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import (JWTManager, create_access_token, create_refresh_token, jwt_required, get_jwt_identity)
from sqlalchemy import select
from sqlalchemy.orm import Session
from db import Base, engine, SessionLocal
from models import User, Profile, Item
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
app.config["JWT_SECRET_KEY"] = os.getenv("SECRET_KEY", "dev")
jwt = JWTManager(app)

with engine.begin() as conn:
    Base.metadata.create_all(bind=conn)

@app.get("/api/health")
def health():
    return jsonify(ok=True)

@app.post("/api/auth/register")
def register():
    data = request.json or {}
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify(error="email and password required"), 400
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == email)):
            return jsonify(error="email in use"), 400
        u = User(email=email, password_hash=generate_password_hash(password))  # NOTE: hash in real app
        db.add(u); db.flush()
        prof = Profile(user_id=u.id, name="You", conditions=[], preferences={"dislikes":[]}, calories_target=2000)
        db.add(prof)
        db.commit()
    return jsonify(ok=True)

@app.post("/api/auth/login")
def login():
    data = request.json or {}
    email = data.get("email"); password = data.get("password")
    with SessionLocal() as db:
        u = db.scalar(select(User).where(User.email==email))
        if not u or not check_password_hash(u.password_hash, password):
        return jsonify(error=\"invalid credentials\"), 401
        
        

@app.get("/api/profile")
@jwt_required()
def get_profile():
    uid = get_jwt_identity()
    with SessionLocal() as db:
        p = db.scalar(select(Profile).where(Profile.user_id==uid))
        return jsonify({
            "name": p.name,
            "conditions": p.conditions or [],
            "preferences": p.preferences or {},
            "calories_target": p.calories_target
        })

@app.put("/api/profile")
@jwt_required()
def update_profile():
    uid = get_jwt_identity()
    data = request.json or {}
    with SessionLocal() as db:
        p = db.scalar(select(Profile).where(Profile.user_id==uid))
        p.name = data.get("name", p.name)
        p.conditions = data.get("conditions", p.conditions or [])
        p.preferences = data.get("preferences", p.preferences or {})
        p.calories_target = data.get("calories_target", p.calories_target)
        db.add(p); db.commit()
        return jsonify(ok=True)

@app.get("/api/items")
@jwt_required()
def list_items():
    uid = get_jwt_identity()
    with SessionLocal() as db:
        rows = db.execute(select(Item).where(Item.user_id==uid).order_by(Item.id.desc()).scalars().all()
        def to_dict(i):
            return {
                "id": i.id, "name": i.name, "barcode": i.barcode, "location": i.location,
                "quantity": i.quantity, "unit": i.unit, "calories_per_unit": i.calories_per_unit,
                "expires_on": i.expires_on.isoformat() if i.expires_on else None,
                "sustainability_score": i.sustainability_score, "health_tags": i.health_tags or []
            }
        return jsonify([to_dict(i) for i in rows])

@app.post("/api/items")
@jwt_required()
def add_item():
    uid = get_jwt_identity()
    data = request.json or {}
    bcode = (data.get("barcode") or "").strip() or None
    name = data.get("name", "").strip()
    if bcode and not name:
        auto = fetch_off_by_barcode(bcode)
        if auto and auto.get("name"):
            name = auto["name"]
        if auto and auto.get("calories_per_unit") and not data.get("calories_per_unit"):
            data["calories_per_unit"] = auto["calories_per_unit"]
    if not name:
        return jsonify(error="name required"), 400
    it = Item(
        user_id=uid,
        name=name,
        barcode=bcode,
        location=data.get("location","fridge"),
        quantity=float(data.get("quantity",1.0)),
        unit=data.get("unit","pcs"),
        calories_per_unit=data.get("calories_per_unit"),
        expires_on=datetime.date.fromisoformat(data["expires_on"]) if data.get("expires_on") else None,
        sustainability_score=int(data.get("sustainability_score") or sustainability_hint(name)),
        health_tags=data.get("health_tags") or []
    )
    with SessionLocal() as db:
        db.add(it); db.commit(); db.refresh(it)
        return jsonify(id=it.id)

@app.delete("/api/items/<int:item_id>")
@jwt_required()
def delete_item(item_id):
    uid = get_jwt_identity()
    with SessionLocal() as db:
        it = db.get(Item, item_id)
        if not it or it.user_id != uid:
            return jsonify(error="not found"), 404
        db.delete(it); db.commit()
        return jsonify(ok=True)

@app.get("/api/barcode/<barcode>")
@jwt_required()
def barcode_lookup(barcode):
    return jsonify(fetch_off_by_barcode(barcode) or {})

@app.post("/api/recipes/suggest")
@jwt_required()
def suggest_recipes():
    uid = get_jwt_identity()
    use_api = bool(os.getenv("SPOONACULAR_KEY"))
    with SessionLocal() as db:
        items = db.execute(select(Item).where(Item.user_id==uid)).scalars().all()
        inv = [i.name for i in items]
        profile = db.scalar(select(Profile).where(Profile.user_id==uid))
        prefs = profile.preferences or {}
        conditions = (profile.conditions or [])
        if use_api:
            res = spoonacular_by_ingredients(inv)
            res = filter_recipes(res, prefs, conditions)
            return jsonify(res[:10])
        else:
            res = fallback_recipes(inv, prefs, conditions)
            return jsonify(res)

def fetch_off_by_barcode(barcode):
    try:
        r = requests.get(f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json", timeout=4)
        if r.status_code != 200: return None
        data = r.json()
        if data.get("status") != 1: return None
        p = data.get("product", {})
        name = p.get("product_name") or p.get("generic_name_en") or p.get("brands") or "Unknown item"
        nutriments = p.get("nutriments", {})
        kcal_100g = nutriments.get("energy-kcal_100g") or nutriments.get("energy-kcal_serving")
        cals = round(float(kcal_100g),1) if isinstance(kcal_100g,(int,float)) else None
        return {"name": name, "calories_per_unit": cals}
    except Exception:
        return None

def sustainability_hint(name: str):
    n = (name or "").lower()
    if any(x in n for x in ["beef","lamb","mutton"]): return 15
    if any(x in n for x in ["pork","cheese"]): return 30
    if any(x in n for x in ["chicken","poultry","turkey"]): return 40
    if any(x in n for x in ["tofu","lentil","bean","chickpea","pea"]): return 85
    if any(x in n for x in ["broccoli","spinach","apple","banana","carrot","oat","oats"]): return 80
    return 50

def filter_recipes(recipes, prefs, conditions):
    out = []
    dislikes = set([d.lower() for d in (prefs.get("dislikes") or [])])
    for r in recipes:
        ing = ", ".join(r.get("ingredients", [])).lower()
        if prefs.get("vegan") and r.get("contains_meat"): continue
        if prefs.get("vegetarian") and r.get("contains_meat"): continue
        if any(d in ing for d in dislikes): continue
        if "diabetes" in [c.lower() for c in (conditions or [])] and r.get("calories", 0) > 800: 
            continue
        out.append(r)
    return out

def spoonacular_by_ingredients(inv_list):
    key = os.getenv("SPOONACULAR_KEY")
    if not key: return []
    try:
        q = ",".join(inv_list[:10]) or "tomato,garlic,onion"
        url = f"https://api.spoonacular.com/recipes/findByIngredients?apiKey={key}&ingredients={q}&number=10&ranking=2"
        resp = requests.get(url, timeout=6)
        data = resp.json()
        out = []
        for d in data:
            out.append({
                "title": d.get("title"),
                "ingredients": [i.get("name") for i in d.get("missedIngredients", []) + d.get("usedIngredients", [])],
                "image": d.get("image"),
                "contains_meat": False  # naive
            })
        return out
    except Exception:
        return []

def fallback_recipes(inv_list, prefs, conditions):
    # Toy suggestions when external API key isn't set
    base = [
        {"title": "Chickpea Salad","ingredients":["chickpeas","cucumber","tomato","olive oil","lemon","parsley"],"calories":350,"contains_meat":False},
        {"title": "Veggie Stir-Fry","ingredients":["broccoli","pepper","garlic","tofu","soy sauce","rice"],"calories":600,"contains_meat":False},
        {"title": "Chicken Pasta","ingredients":["chicken","pasta","garlic","tomato","olive oil","basil"],"calories":750,"contains_meat":True}
    ]
    inv = set(" ".join(inv_list).lower().split())
    scored = []
    for r in base:
        ing_words = set(" ".join(r["ingredients"]).lower().split())
        overlap = len(inv & ing_words) / max(1,len(ing_words))
        r2 = dict(r); r2["match"] = overlap
        scored.append(r2)
    scored.sort(key=lambda x: x["match"], reverse=True)
    return filter_recipes(scored, prefs, conditions)


@app.post("/api/auth/refresh")
@jwt_required(refresh=True)
def refresh_token():
    uid = get_jwt_identity()
    access = create_access_token(identity=uid)
    return jsonify(access_token=access)


@app.put("/api/items/<int:item_id>")
@jwt_required()
def update_item(item_id):
    uid = get_jwt_identity()
    data = request.json or {}
    with SessionLocal() as db:
        it = db.get(Item, item_id)
        if not it or it.user_id != uid:
            return jsonify(error="not found"), 404
        for k in ["name","barcode","location","quantity","unit","calories_per_unit","sustainability_score","health_tags"]:
            if k in data: setattr(it, k, data[k])
        if "expires_on" in data:
            import datetime as _dt
            it.expires_on = _dt.date.fromisoformat(data["expires_on"]) if data["expires_on"] else None
        db.add(it); db.commit()
        return jsonify(ok=True)
