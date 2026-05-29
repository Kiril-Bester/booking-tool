from database import SessionLocal, engine, Base
import models

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Simple hash function (same as in crud.py)
import hashlib
import base64

def hash_password(password: str) -> str:
    salt = "booking-app-salt-2024"
    combined = password + salt
    hash_bytes = hashlib.sha256(combined.encode()).digest()
    return base64.b64encode(hash_bytes).decode()

# Check if users exist
admin = db.query(models.User).filter(models.User.username == "admin").first()
if not admin:
    print("Creating admin user...")
    admin = models.User(
        username="admin",
        email="admin@example.com",
        hashed_password=hash_password("admin123"),
        is_admin=True
    )
    db.add(admin)

# Create regular user
john = db.query(models.User).filter(models.User.username == "john_doe").first()
if not john:
    print("Creating john_doe user...")
    john = models.User(
        username="john_doe",
        email="john@example.com",
        hashed_password=hash_password("admin123"),
        is_admin=False
    )
    db.add(john)

db.commit()
print("Users created successfully!")

# Verify
users = db.query(models.User).all()
print("\nUsers in database:")
for user in users:
    print(f"  - {user.username} (Admin: {user.is_admin})")

db.close()