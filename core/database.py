from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from core.configs import settings

DATABASE_URL = settings.DATABASE_URL

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
