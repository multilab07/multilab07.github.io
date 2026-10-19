import os
import sys
from pathlib import Path
import pytest

# Ensure backend directory is in python path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app import app
from db import init_and_migrate_db, connect
from seed_data import seed_verified_data

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    init_and_migrate_db()
    seed_verified_data()

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client
