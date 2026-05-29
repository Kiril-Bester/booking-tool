from database import engine, Base, SessionLocal
import models
from datetime import datetime, time, timedelta
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def init_database():
    print("🔄 Creating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        print("📝 Creating users...")
        # Create admin user
        admin = models.User(
            username="admin",
            email="admin@example.com",
            hashed_password=pwd_context.hash("admin123"),
            is_admin=True
        )
        db.add(admin)
        
        # Create regular user
        user = models.User(
            username="john_doe",
            email="john@example.com",
            hashed_password=pwd_context.hash("admin123"),
            is_admin=False
        )
        db.add(user)
        db.commit()
        
        print("🏢 Creating resources...")
        resources = [
            models.Resource(
                name="Conference Room A",
                description="Large conference room with projector and whiteboard",
                availability_start=time(8, 0),
                availability_end=time(18, 0),
                availability_days="MON,TUE,WED,THU,FRI"
            ),
            models.Resource(
                name="Meeting Room B",
                description="Small meeting room for 4-6 people",
                availability_start=time(9, 0),
                availability_end=time(17, 0),
                availability_days="MON,TUE,WED,THU,FRI"
            ),
            models.Resource(
                name="Workshop Machine",
                description="3D printer and laser cutter",
                availability_start=time(10, 0),
                availability_end=time(20, 0),
                availability_days="MON,TUE,WED,THU,FRI,SAT"
            ),
            models.Resource(
                name="Pool Vehicle",
                description="Electric car for business trips",
                availability_start=time(7, 0),
                availability_end=time(22, 0),
                availability_days="MON,TUE,WED,THU,FRI,SAT,SUN"
            )
        ]
        
        for resource in resources:
            db.add(resource)
        db.commit()
        
        print("📅 Creating sample bookings...")
        now = datetime.now()
        bookings = [
            models.Booking(
                resource_id=1,
                user_id=user.id,
                title="Weekly Team Sync",
                start_time=now + timedelta(days=1),
                end_time=now + timedelta(days=1, hours=1)
            ),
            models.Booking(
                resource_id=1,
                user_id=user.id,
                title="Client Presentation",
                start_time=now + timedelta(days=3),
                end_time=now + timedelta(days=3, hours=2)
            )
        ]
        
        for booking in bookings:
            db.add(booking)
        db.commit()
        
        print("✅ Database initialization complete!")
        print(f"   - Users created: 2")
        print(f"   - Resources created: {len(resources)}")
        print(f"   - Bookings created: {len(bookings)}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_database()