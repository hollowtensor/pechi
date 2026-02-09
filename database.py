"""
Maruti Suzuki Service Center Database
SQLite schema, seed data, and safe read-only query execution.
"""

import json
import logging
import re
import sqlite3
from datetime import date, timedelta
from pathlib import Path

log = logging.getLogger("database")

DB_PATH = Path(__file__).parent / "maruti_service.db"

# These must appear as standalone SQL keywords (word boundaries), not inside column names
BLOCKED_KEYWORDS = [
    "DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE",
    "ATTACH", "DETACH", "PRAGMA", "VACUUM", "REINDEX",
]
# Note: REPLACE() as a SQL function inside SELECT is safe and used for
# registration number normalization. Only "INSERT OR REPLACE" is dangerous
# and is already blocked by the INSERT keyword above.
MAX_ROWS = 20
QUERY_TIMEOUT = 5  # seconds

# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

SCHEMA = """
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    model TEXT NOT NULL,
    variant TEXT,
    fuel_type TEXT,
    year INTEGER,
    registration_no TEXT UNIQUE,
    vin TEXT UNIQUE,
    color TEXT,
    purchase_date TEXT,
    current_mileage INTEGER
);

CREATE TABLE IF NOT EXISTS service_records (
    id INTEGER PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id),
    service_date TEXT NOT NULL,
    service_type TEXT NOT NULL,
    description TEXT,
    parts_replaced TEXT,
    technician TEXT,
    status TEXT DEFAULT 'completed',
    cost REAL,
    next_service_date TEXT,
    next_service_mileage INTEGER,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS service_packages (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    applicable_models TEXT,
    price REAL,
    validity_months INTEGER,
    includes TEXT
);

CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    part_number TEXT UNIQUE,
    category TEXT,
    compatible_models TEXT,
    price REAL,
    in_stock INTEGER DEFAULT 1
);
"""

# ---------------------------------------------------------------------------
# Date shifting — keeps seed data current relative to today
# ---------------------------------------------------------------------------

# The newest completed service date in the static seed data below
_SEED_NEWEST_DATE = date(2025, 1, 15)
# We want that record to appear as ~2 months ago
_TARGET_AGE_DAYS = 60


def _shift_days() -> int:
    """Days to shift all seed dates forward so data stays current."""
    return (date.today() - _SEED_NEWEST_DATE).days - _TARGET_AGE_DAYS


def _shift_date(date_str: str | None) -> str | None:
    """Shift a YYYY-MM-DD date string forward by the computed offset."""
    if not date_str:
        return date_str
    try:
        d = date.fromisoformat(date_str)
        return (d + timedelta(days=_shift_days())).isoformat()
    except ValueError:
        return date_str


# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

CUSTOMERS = [
    (1, "Rajesh Kumar", "9876543210", "rajesh.k@email.com", "42 MG Road, Pune"),
    (2, "Priya Sharma", "9823456789", "priya.s@email.com", "15 Koregaon Park, Pune"),
    (3, "Amit Patel", "9812345678", "amit.p@email.com", "78 FC Road, Pune"),
    (4, "Sunita Deshmukh", "9834567890", "sunita.d@email.com", "23 Baner Road, Pune"),
    (5, "Vikram Singh", "9845678901", "vikram.s@email.com", "56 Hinjewadi Phase 1, Pune"),
    (6, "Meera Joshi", "9856789012", "meera.j@email.com", "11 Aundh, Pune"),
    (7, "Suresh Reddy", "9867890123", "suresh.r@email.com", "34 Wakad, Pune"),
    (8, "Anita Kulkarni", "9878901234", "anita.k@email.com", "67 Kothrud, Pune"),
    (9, "Deepak Gupta", "9889012345", "deepak.g@email.com", "89 Viman Nagar, Pune"),
    (10, "Kavita Nair", "9890123456", "kavita.n@email.com", "12 Hadapsar, Pune"),
    (11, "Rohit Bhosale", "9801234567", "rohit.b@email.com", "45 Pimpri, Pune"),
    (12, "Smita Pawar", "9812340987", "smita.p@email.com", "78 Chinchwad, Pune"),
    (13, "Arun Mehta", "9823451098", "arun.m@email.com", "23 Shivaji Nagar, Pune"),
    (14, "Neha Iyer", "9834562109", "neha.i@email.com", "56 Deccan, Pune"),
    (15, "Manish Tiwari", "9845673210", "manish.t@email.com", "34 Kalyani Nagar, Pune"),
    (16, "Pooja Deshpande", "9856784321", "pooja.d@email.com", "67 Magarpatta, Pune"),
    (17, "Sanjay Gaikwad", "9867895432", "sanjay.g@email.com", "89 Undri, Pune"),
    (18, "Ritu Chopra", "9878906543", "ritu.c@email.com", "12 Bibwewadi, Pune"),
    (19, "Kiran Jadhav", "9889017654", "kiran.j@email.com", "45 Sinhagad Road, Pune"),
    (20, "Divya Rao", "9890128765", "divya.r@email.com", "78 Camp, Pune"),
]

VEHICLES = [
    (1, 1, "Swift", "ZXI+", "Petrol", 2022, "MH-12-AB-1234", "MA3FJEB1S00123456", "Pearl Arctic White", "2022-03-15", 35200),
    (2, 1, "Dzire", "VXI", "Petrol", 2020, "MH-12-CD-5678", "MA3EJEG1S00234567", "Sherwood Brown", "2020-08-20", 52100),
    (3, 2, "Baleno", "Alpha", "Petrol", 2023, "MH-12-EF-9012", "MA3FHEB1S00345678", "Nexa Blue", "2023-01-10", 18500),
    (4, 3, "Brezza", "ZXI+", "Petrol", 2023, "MH-12-GH-3456", "MA3EWDE1S00456789", "Brave Khaki", "2023-06-22", 22300),
    (5, 4, "WagonR", "ZXI", "CNG", 2021, "MH-12-IJ-7890", "MA3FWDE1S00567890", "Magma Grey", "2021-11-05", 41800),
    (6, 5, "Ertiga", "ZXI+", "Petrol", 2022, "MH-12-KL-2345", "MA3FJDE1S00678901", "Pearl Midnight Black", "2022-07-14", 38600),
    (7, 6, "Fronx", "Alpha", "Turbo Petrol", 2024, "MH-12-MN-6789", "MA3FHEG1S00789012", "Earthen Brown", "2024-02-18", 8200),
    (8, 7, "Grand Vitara", "Alpha+", "Hybrid", 2023, "MH-12-OP-1234", "MA3EWEF1S00890123", "Arctic White", "2023-09-01", 15400),
    (9, 8, "Alto K10", "VXI+", "Petrol", 2023, "MH-12-QR-5678", "MA3EADE1S00901234", "Solid Fire Red", "2023-04-12", 19800),
    (10, 9, "Ciaz", "Alpha", "Petrol", 2021, "MH-12-ST-9012", "MA3EJEF1S01012345", "Premium Silver", "2021-05-30", 47200),
    (11, 10, "Celerio", "ZXI", "Petrol", 2022, "MH-12-UV-3456", "MA3FADE1S01123456", "Silky Silver", "2022-10-08", 28900),
    (12, 11, "XL6", "Alpha", "Petrol", 2023, "MH-14-WX-7890", "MA3FJDG1S01234567", "Opulent Red", "2023-03-25", 21500),
    (13, 12, "Swift", "VXI", "Petrol", 2021, "MH-14-YZ-2345", "MA3FJEB1S01345678", "Sizzling Red", "2021-09-16", 44600),
    (14, 13, "Jimny", "Alpha", "Petrol", 2024, "MH-12-AA-6789", "MA3EWDG1S01456789", "Kinetic Yellow", "2024-01-08", 6800),
    (15, 14, "Baleno", "Delta", "Petrol", 2022, "MH-12-BB-1234", "MA3FHEB1S01567890", "Luxe Beige", "2022-06-20", 31200),
    (16, 15, "Dzire", "ZXI+", "Petrol", 2023, "MH-14-CC-5678", "MA3EJEG1S01678901", "Oxford Blue", "2023-08-15", 16700),
    (17, 16, "Brezza", "VXI", "Petrol", 2022, "MH-12-DD-9012", "MA3EWDE1S01789012", "Sizzling Red", "2022-12-01", 33400),
    (18, 17, "WagonR", "LXI", "Petrol", 2020, "MH-14-EE-3456", "MA3FWDE1S01890123", "Poolside Blue", "2020-04-18", 58200),
    (19, 18, "Ertiga", "VXI", "CNG", 2023, "MH-12-FF-7890", "MA3FJDE1S01901234", "Pearl Midnight Black", "2023-05-22", 24100),
    (20, 19, "Invicto", "Alpha+", "Hybrid", 2024, "MH-12-GG-2345", "MA3FWEF1S02012345", "Platinum White", "2024-04-10", 5200),
    (21, 20, "Fronx", "Delta+", "Petrol", 2024, "MH-14-HH-6789", "MA3FHEG1S02123456", "Splendid Silver", "2024-03-05", 9100),
    (22, 5, "Swift", "ZXI", "Petrol", 2023, "MH-12-II-1234", "MA3FJEB1S02234567", "Pearl Arctic White", "2023-11-10", 12800),
    (23, 9, "WagonR", "ZXI", "CNG", 2022, "MH-12-JJ-5678", "MA3FWDE1S02345678", "Magma Grey", "2022-02-14", 39500),
    (24, 3, "Baleno", "Zeta", "Petrol", 2024, "MH-12-KK-9012", "MA3FHEB1S02456789", "Arctic White", "2024-05-20", 4500),
    (25, 15, "Ertiga", "ZXI", "Petrol", 2021, "MH-14-LL-3456", "MA3FJDE1S02567890", "Magma Grey", "2021-07-30", 43800),
]

SERVICE_RECORDS = [
    # Vehicle 1 - Swift ZXI+ 2022 (Rajesh)
    (1, 1, "2022-09-15", "Regular Service", "First free service - oil change, filter check, general inspection", '["Engine Oil", "Oil Filter"]', "Ravi Patil", "completed", 0.00, "2023-03-15", 10000, "All parameters normal"),
    (2, 1, "2023-03-20", "Regular Service", "Second free service - comprehensive check", '["Engine Oil", "Oil Filter", "Air Filter"]', "Ravi Patil", "completed", 0.00, "2023-09-20", 20000, None),
    (3, 1, "2023-10-05", "Paid Service", "Third service - brake pad replacement needed", '["Engine Oil", "Oil Filter", "Front Brake Pads"]', "Sunil Mane", "completed", 4850.00, "2024-04-05", 30000, "Front brake pads worn, replaced"),
    (4, 1, "2024-04-15", "Paid Service", "Annual service with tyre rotation", '["Engine Oil", "Oil Filter", "Air Filter", "Cabin Filter"]', "Ravi Patil", "completed", 3200.00, "2024-10-15", 40000, "Tyre rotation done, alignment checked"),
    (5, 1, "2024-11-01", "Paid Service", "Regular maintenance", '["Engine Oil", "Oil Filter"]', "Sunil Mane", "completed", 2800.00, "2025-05-01", 50000, None),

    # Vehicle 2 - Dzire VXI 2020 (Rajesh)
    (6, 2, "2021-02-20", "Regular Service", "First free service", '["Engine Oil", "Oil Filter"]', "Ravi Patil", "completed", 0.00, "2021-08-20", 10000, None),
    (7, 2, "2021-09-10", "Regular Service", "Second free service", '["Engine Oil", "Oil Filter", "Air Filter"]', "Sunil Mane", "completed", 0.00, "2022-03-10", 20000, None),
    (8, 2, "2022-04-05", "Paid Service", "Clutch cable adjustment", '["Engine Oil", "Oil Filter", "Clutch Cable"]', "Ravi Patil", "completed", 3500.00, "2022-10-05", 30000, "Clutch cable tension adjusted"),
    (9, 2, "2023-01-15", "Paid Service", "Battery replacement + service", '["Engine Oil", "Oil Filter", "Battery"]', "Sunil Mane", "completed", 7200.00, "2023-07-15", 40000, "Original battery dead, replaced with Amaron"),
    (10, 2, "2023-08-20", "Paid Service", "Regular service + AC gas top-up", '["Engine Oil", "Oil Filter", "AC Gas"]', "Ravi Patil", "completed", 4100.00, "2024-02-20", 50000, "AC cooling improved after gas refill"),
    (11, 2, "2024-09-10", "Paid Service", "Suspension check, front strut replacement", '["Engine Oil", "Oil Filter", "Front Struts"]', "Sunil Mane", "completed", 8900.00, "2025-03-10", 60000, "Front struts leaking, replaced both"),

    # Vehicle 3 - Baleno Alpha 2023 (Priya)
    (12, 3, "2023-07-10", "Regular Service", "First free service", '["Engine Oil", "Oil Filter"]', "Ajay Shinde", "completed", 0.00, "2024-01-10", 10000, None),
    (13, 3, "2024-01-20", "Regular Service", "Second free service", '["Engine Oil", "Oil Filter", "Air Filter"]', "Ajay Shinde", "completed", 0.00, "2024-07-20", 20000, None),
    (14, 3, "2024-08-05", "Paid Service", "Wheel alignment + balancing", '["Engine Oil", "Oil Filter"]', "Ravi Patil", "completed", 3800.00, "2025-02-05", 30000, "Slight pull to left corrected"),

    # Vehicle 4 - Brezza ZXI+ 2023 (Amit)
    (15, 4, "2023-12-22", "Regular Service", "First free service", '["Engine Oil", "Oil Filter"]', "Ajay Shinde", "completed", 0.00, "2024-06-22", 10000, None),
    (16, 4, "2024-07-10", "Regular Service", "Second free service", '["Engine Oil", "Oil Filter", "Air Filter"]', "Sunil Mane", "completed", 0.00, "2025-01-10", 20000, "All OK"),
    (17, 4, "2025-01-15", "Paid Service", "Tyre replacement - all four", '["Front Tyres x2", "Rear Tyres x2"]', "Ravi Patil", "completed", 22000.00, "2025-07-15", 30000, "Replaced with CEAT SecuraDrive"),

    # Vehicle 5 - WagonR ZXI CNG 2021 (Sunita)
    (18, 5, "2022-05-05", "Regular Service", "First free service", '["Engine Oil", "Oil Filter"]', "Ravi Patil", "completed", 0.00, "2022-11-05", 10000, None),
    (19, 5, "2022-12-10", "Regular Service", "Second free service + CNG check", '["Engine Oil", "Oil Filter", "Air Filter"]', "Sunil Mane", "completed", 0.00, "2023-06-10", 20000, "CNG kit functioning well"),
    (20, 5, "2023-07-05", "Paid Service", "CNG sequential kit recalibration", '["Engine Oil", "Oil Filter", "Spark Plugs"]', "Ajay Shinde", "completed", 4500.00, "2024-01-05", 30000, "Spark plugs replaced, CNG calibrated"),
    (21, 5, "2024-02-15", "Paid Service", "Regular service", '["Engine Oil", "Oil Filter"]', "Ravi Patil", "completed", 2600.00, "2024-08-15", 40000, None),
    (22, 5, "2024-09-20", "Warranty Repair", "Power window motor replaced under extended warranty", '["Power Window Motor - Front Right"]', "Sunil Mane", "completed", 0.00, "2025-03-20", 50000, "Covered under extended warranty"),

    # Vehicle 6 - Ertiga ZXI+ 2022 (Vikram)
    (23, 6, "2023-01-14", "Regular Service", "First free service", '["Engine Oil", "Oil Filter"]', "Ajay Shinde", "completed", 0.00, "2023-07-14", 10000, None),
    (24, 6, "2023-08-05", "Regular Service", "Second free service", '["Engine Oil", "Oil Filter", "Air Filter"]', "Ravi Patil", "completed", 0.00, "2024-02-05", 20000, None),
    (25, 6, "2024-03-10", "Paid Service", "Major service - timing chain check", '["Engine Oil", "Oil Filter", "Air Filter", "Cabin Filter", "Brake Fluid"]', "Sunil Mane", "completed", 6200.00, "2024-09-10", 30000, "Timing chain OK, no replacement needed"),
    (26, 6, "2024-10-01", "Accident Repair", "Front bumper and headlamp repair", '["Front Bumper", "Left Headlamp Assembly"]', "Ajay Shinde", "completed", 15800.00, None, None, "Minor front collision, insurance claim filed"),

    # Vehicle 7 - Fronx Alpha 2024 (Meera)
    (27, 7, "2024-08-18", "Regular Service", "First free service", '["Engine Oil", "Oil Filter"]', "Ravi Patil", "completed", 0.00, "2025-02-18", 10000, "Turbo engine all parameters excellent"),

    # Vehicle 8 - Grand Vitara Alpha+ Hybrid 2023 (Suresh)
    (28, 8, "2024-03-01", "Regular Service", "First free service - hybrid system check", '["Engine Oil", "Oil Filter"]', "Ajay Shinde", "completed", 0.00, "2024-09-01", 10000, "Hybrid battery health: 98%"),
    (29, 8, "2024-09-15", "Regular Service", "Second free service", '["Engine Oil", "Oil Filter", "Air Filter"]', "Ravi Patil", "completed", 0.00, "2025-03-15", 20000, "Hybrid system diagnostics passed"),

    # Vehicle 9 - Alto K10 VXI+ 2023 (Anita)
    (30, 9, "2023-10-12", "Regular Service", "First free service", '["Engine Oil", "Oil Filter"]', "Sunil Mane", "completed", 0.00, "2024-04-12", 10000, None),
    (31, 9, "2024-05-05", "Regular Service", "Second free service", '["Engine Oil", "Oil Filter", "Air Filter"]', "Ravi Patil", "completed", 0.00, "2024-11-05", 20000, None),

    # Vehicle 10 - Ciaz Alpha 2021 (Deepak)
    (32, 10, "2021-11-30", "Regular Service", "First free service", '["Engine Oil", "Oil Filter"]', "Ajay Shinde", "completed", 0.00, "2022-05-30", 10000, None),
    (33, 10, "2022-06-15", "Regular Service", "Second free service", '["Engine Oil", "Oil Filter", "Air Filter"]', "Ravi Patil", "completed", 0.00, "2022-12-15", 20000, None),
    (34, 10, "2023-01-20", "Paid Service", "Third service + wiper blade replacement", '["Engine Oil", "Oil Filter", "Wiper Blades"]', "Sunil Mane", "completed", 3900.00, "2023-07-20", 30000, None),
    (35, 10, "2023-08-10", "Paid Service", "AC compressor repair", '["AC Compressor", "AC Gas"]', "Ajay Shinde", "completed", 12500.00, "2024-02-10", 40000, "AC compressor bearing worn, replaced"),
    (36, 10, "2024-03-05", "Paid Service", "Regular service + clutch plate", '["Engine Oil", "Oil Filter", "Clutch Plate", "Pressure Plate"]', "Ravi Patil", "completed", 9800.00, "2024-09-05", 50000, "Clutch plate worn at 47K km"),

    # Vehicle 11 - Celerio ZXI 2022 (Kavita)
    (37, 11, "2023-04-08", "Regular Service", "First free service", '["Engine Oil", "Oil Filter"]', "Sunil Mane", "completed", 0.00, "2023-10-08", 10000, None),
    (38, 11, "2023-11-01", "Regular Service", "Second free service", '["Engine Oil", "Oil Filter", "Air Filter"]', "Ajay Shinde", "completed", 0.00, "2024-05-01", 20000, None),
    (39, 11, "2024-06-15", "Paid Service", "Battery + general service", '["Engine Oil", "Oil Filter", "Battery"]', "Ravi Patil", "completed", 6800.00, "2024-12-15", 30000, "Battery replacement - Exide"),

    # Vehicle 12 - XL6 Alpha 2023 (Rohit)
    (40, 12, "2023-09-25", "Regular Service", "First free service", '["Engine Oil", "Oil Filter"]', "Ajay Shinde", "completed", 0.00, "2024-03-25", 10000, None),
    (41, 12, "2024-04-10", "Regular Service", "Second free service", '["Engine Oil", "Oil Filter", "Air Filter"]', "Sunil Mane", "completed", 0.00, "2024-10-10", 20000, None),
    (42, 12, "2024-11-15", "Paid Service", "Rear brake pad replacement", '["Engine Oil", "Oil Filter", "Rear Brake Pads"]', "Ravi Patil", "completed", 4200.00, "2025-05-15", 30000, None),

    # Vehicle 13 - Swift VXI 2021 (Smita)
    (43, 13, "2022-03-16", "Regular Service", "First free service", '["Engine Oil", "Oil Filter"]', "Ravi Patil", "completed", 0.00, "2022-09-16", 10000, None),
    (44, 13, "2022-10-01", "Regular Service", "Second free service", '["Engine Oil", "Oil Filter", "Air Filter"]', "Sunil Mane", "completed", 0.00, "2023-04-01", 20000, None),
    (45, 13, "2023-05-10", "Paid Service", "General service + coolant flush", '["Engine Oil", "Oil Filter", "Coolant"]', "Ajay Shinde", "completed", 3600.00, "2023-11-10", 30000, None),
    (46, 13, "2024-01-20", "Paid Service", "Front suspension repair", '["Engine Oil", "Oil Filter", "Front Shock Absorbers"]', "Ravi Patil", "completed", 7800.00, "2024-07-20", 40000, "Shock absorbers replaced, ride quality restored"),
    (47, 13, "2024-08-15", "Paid Service", "Regular service", '["Engine Oil", "Oil Filter"]', "Sunil Mane", "completed", 2800.00, "2025-02-15", 50000, None),

    # Vehicle 14 - Jimny Alpha 2024 (Arun)
    (48, 14, "2024-07-08", "Regular Service", "First free service", '["Engine Oil", "Oil Filter"]', "Ajay Shinde", "completed", 0.00, "2025-01-08", 10000, "4WD system checked, all OK"),

    # Vehicle 16 - Dzire ZXI+ 2023 (Manish)
    (49, 16, "2024-02-15", "Regular Service", "First free service", '["Engine Oil", "Oil Filter"]', "Ravi Patil", "completed", 0.00, "2024-08-15", 10000, None),
    (50, 16, "2024-09-01", "Regular Service", "Second free service", '["Engine Oil", "Oil Filter", "Air Filter"]', "Sunil Mane", "completed", 0.00, "2025-03-01", 20000, None),

    # Vehicle 17 - Brezza VXI 2022 (Pooja)
    (51, 17, "2023-06-01", "Regular Service", "First free service", '["Engine Oil", "Oil Filter"]', "Ajay Shinde", "completed", 0.00, "2023-12-01", 10000, None),
    (52, 17, "2023-12-20", "Regular Service", "Second free service", '["Engine Oil", "Oil Filter", "Air Filter"]', "Ravi Patil", "completed", 0.00, "2024-06-20", 20000, None),
    (53, 17, "2024-07-15", "Paid Service", "Tyre rotation + wheel alignment", '["Engine Oil", "Oil Filter"]', "Sunil Mane", "completed", 3400.00, "2025-01-15", 30000, "Tyres rotated, alignment done"),

    # Vehicle 18 - WagonR LXI 2020 (Sanjay)
    (54, 18, "2020-10-18", "Regular Service", "First free service", '["Engine Oil", "Oil Filter"]', "Ravi Patil", "completed", 0.00, "2021-04-18", 10000, None),
    (55, 18, "2021-05-10", "Regular Service", "Second free service", '["Engine Oil", "Oil Filter", "Air Filter"]', "Sunil Mane", "completed", 0.00, "2021-11-10", 20000, None),
    (56, 18, "2022-01-15", "Paid Service", "Third service", '["Engine Oil", "Oil Filter", "Spark Plugs"]', "Ajay Shinde", "completed", 3200.00, "2022-07-15", 30000, None),
    (57, 18, "2022-08-20", "Paid Service", "AC service + belt replacement", '["Engine Oil", "Oil Filter", "AC Belt", "AC Gas"]', "Ravi Patil", "completed", 4800.00, "2023-02-20", 40000, None),
    (58, 18, "2023-04-10", "Paid Service", "Regular service", '["Engine Oil", "Oil Filter"]', "Sunil Mane", "completed", 2600.00, "2023-10-10", 50000, None),
    (59, 18, "2024-01-05", "Paid Service", "Major service - exhaust + brakes", '["Engine Oil", "Oil Filter", "Exhaust Pipe", "Front Brake Pads", "Rear Brake Shoes"]', "Ajay Shinde", "completed", 11500.00, "2024-07-05", 60000, "Exhaust pipe corroded, brakes worn"),

    # Vehicle 20 - Invicto Alpha+ Hybrid 2024 (Kiran)
    (60, 20, "2024-10-10", "Regular Service", "First free service - hybrid check", '["Engine Oil", "Oil Filter"]', "Ravi Patil", "completed", 0.00, "2025-04-10", 10000, "Hybrid battery health: 100%"),

    # Scheduled services
    (61, 4, "2025-07-15", "Paid Service", "Upcoming scheduled service", None, None, "scheduled", None, None, 40000, "Third paid service due"),
    (62, 7, "2025-02-18", "Regular Service", "Second free service due", None, None, "scheduled", None, None, 20000, "Reminder sent to customer"),
    (63, 22, "2025-05-10", "Regular Service", "First free service due", None, None, "scheduled", None, None, 10000, None),
]

SERVICE_PACKAGES = [
    (1, "Maruti EcoService", "Basic service package - oil change, filter replacement, multi-point inspection",
     "Alto K10,WagonR,Celerio,Swift,Dzire", 2499.00, 6,
     '["Engine Oil Change", "Oil Filter", "Multi-point Inspection", "Top-up Fluids"]'),
    (2, "Maruti ProService", "Comprehensive service - includes brakes, AC, and electrical check",
     "Swift,Dzire,Baleno,Ciaz,Brezza,Fronx", 4999.00, 6,
     '["Engine Oil Change", "Oil Filter", "Air Filter", "Brake Inspection", "AC Check", "Electrical Diagnostics", "Wheel Alignment Check"]'),
    (3, "Maruti ProService+", "Premium service for SUVs and premium models",
     "Brezza,Ertiga,XL6,Grand Vitara,Jimny,Fronx,Invicto", 6999.00, 6,
     '["Engine Oil Change", "Oil Filter", "Air Filter", "Cabin Filter", "Brake Inspection", "Suspension Check", "AC Service", "4WD System Check", "Full Diagnostics"]'),
    (4, "AC Care Package", "Complete AC service and sanitization",
     "All Models", 1999.00, 12,
     '["AC Gas Top-up", "AC Filter Cleaning", "Evaporator Cleaning", "Cabin Sanitization"]'),
    (5, "Tyre Care Package", "Tyre rotation, alignment, and balancing",
     "All Models", 1499.00, 12,
     '["Tyre Rotation", "Wheel Alignment", "Wheel Balancing", "Tyre Pressure Check", "Nitrogen Filling"]'),
    (6, "Extended Warranty - 4th & 5th Year", "Extends manufacturer warranty coverage",
     "All Models", 12999.00, 24,
     '["Engine Coverage", "Transmission Coverage", "Electrical Coverage", "AC Compressor", "Power Windows", "Central Locking"]'),
    (7, "Maruti Shield Paint Protection", "Ceramic coating paint protection",
     "All Models", 8999.00, 36,
     '["3-Layer Ceramic Coating", "Paint Correction", "Interior Detailing", "Fabric Protection"]'),
]

PARTS = [
    (1, "Engine Oil (3.5L)", "MGP-OIL-3500", "Engine", "All Models", 1200.00, 1),
    (2, "Oil Filter", "MGP-OFLTR-001", "Engine", "Swift,Dzire,Baleno,Ciaz", 350.00, 1),
    (3, "Oil Filter", "MGP-OFLTR-002", "Engine", "WagonR,Alto K10,Celerio", 280.00, 1),
    (4, "Air Filter", "MGP-AFLTR-001", "Engine", "Swift,Dzire,Baleno", 650.00, 1),
    (5, "Air Filter", "MGP-AFLTR-002", "Engine", "Brezza,Ertiga,XL6,Grand Vitara", 850.00, 1),
    (6, "Cabin Filter", "MGP-CFLTR-001", "Engine", "All Models", 550.00, 1),
    (7, "Front Brake Pads (Set)", "MGP-FBP-001", "Brakes", "Swift,Dzire,Baleno,Ciaz", 2200.00, 1),
    (8, "Front Brake Pads (Set)", "MGP-FBP-002", "Brakes", "Brezza,Ertiga,XL6,Fronx,Grand Vitara", 2800.00, 1),
    (9, "Rear Brake Pads (Set)", "MGP-RBP-001", "Brakes", "Swift,Dzire,Baleno,Ciaz", 1800.00, 1),
    (10, "Rear Brake Shoes (Set)", "MGP-RBS-001", "Brakes", "WagonR,Alto K10,Celerio", 1200.00, 1),
    (11, "Front Shock Absorber (Each)", "MGP-FSA-001", "Suspension", "Swift,Dzire,Baleno", 3200.00, 1),
    (12, "Front Shock Absorber (Each)", "MGP-FSA-002", "Suspension", "Brezza,Grand Vitara,Jimny", 4100.00, 1),
    (13, "Rear Shock Absorber (Each)", "MGP-RSA-001", "Suspension", "Swift,Dzire,Baleno", 2800.00, 1),
    (14, "Clutch Plate", "MGP-CLP-001", "Transmission", "Swift,Dzire,Baleno,Ciaz", 3500.00, 1),
    (15, "Pressure Plate", "MGP-PRP-001", "Transmission", "Swift,Dzire,Baleno,Ciaz", 2800.00, 1),
    (16, "Battery (Amaron 44B20L)", "MGP-BAT-001", "Electrical", "Swift,Dzire,Baleno,WagonR,Alto K10,Celerio", 5500.00, 1),
    (17, "Battery (Exide 55B24L)", "MGP-BAT-002", "Electrical", "Brezza,Ertiga,XL6,Ciaz,Grand Vitara", 6800.00, 1),
    (18, "Spark Plug (Set of 4)", "MGP-SPK-001", "Engine", "All Petrol Models", 1600.00, 1),
    (19, "Wiper Blade (Pair)", "MGP-WPR-001", "Body", "All Models", 850.00, 1),
    (20, "AC Compressor", "MGP-ACC-001", "AC", "Swift,Dzire,Baleno,Ciaz", 9500.00, 1),
    (21, "AC Compressor", "MGP-ACC-002", "AC", "Brezza,Ertiga,XL6,Grand Vitara", 11200.00, 1),
    (22, "Headlamp Assembly (Left)", "MGP-HLA-L01", "Electrical", "Swift 2018+", 4800.00, 1),
    (23, "Headlamp Assembly (Right)", "MGP-HLA-R01", "Electrical", "Swift 2018+", 4800.00, 1),
    (24, "Front Bumper", "MGP-FBM-001", "Body", "Swift 2018+", 3500.00, 1),
    (25, "Front Bumper", "MGP-FBM-002", "Body", "Brezza 2022+", 4200.00, 1),
    (26, "Coolant (1L)", "MGP-CLT-001", "Engine", "All Models", 450.00, 1),
    (27, "Brake Fluid (500ml)", "MGP-BFL-001", "Brakes", "All Models", 380.00, 1),
    (28, "Power Window Motor", "MGP-PWM-001", "Electrical", "All Models", 2800.00, 1),
    (29, "Clutch Cable", "MGP-CLC-001", "Transmission", "WagonR,Alto K10,Celerio", 650.00, 1),
    (30, "AC Belt", "MGP-ACB-001", "AC", "WagonR,Alto K10,Celerio,Swift,Dzire", 480.00, 1),
]

# ---------------------------------------------------------------------------
# Database init + seed
# ---------------------------------------------------------------------------

def _shifted_vehicles():
    """Return vehicles with purchase_date shifted to stay current."""
    shifted = []
    for row in VEHICLES:
        # row: (id, customer_id, model, variant, fuel_type, year, reg, vin, color, purchase_date, mileage)
        purchase = _shift_date(row[9])
        # Adjust year to match shifted purchase date
        year = row[5]
        if purchase:
            year = int(purchase[:4])
        shifted.append((*row[:5], year, *row[6:9], purchase, row[10]))
    return shifted


def _shifted_service_records():
    """Return service records with all dates shifted to stay current."""
    shifted = []
    for row in SERVICE_RECORDS:
        # row: (id, vehicle_id, service_date, service_type, desc, parts, tech, status, cost, next_date, next_mileage, notes)
        shifted.append((
            *row[:2],
            _shift_date(row[2]),   # service_date
            *row[3:9],
            _shift_date(row[9]),   # next_service_date
            *row[10:],
        ))
    return shifted


def init_database() -> None:
    """Create tables and seed data if DB doesn't exist or is empty."""
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    cur.executescript(SCHEMA)

    # Check if already seeded
    cur.execute("SELECT COUNT(*) FROM customers")
    if cur.fetchone()[0] == 0:
        shift = _shift_days()
        log.info(f"Seeding database (shifting dates by {shift} days to stay current)...")
        cur.executemany("INSERT INTO customers VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)", CUSTOMERS)
        cur.executemany("INSERT INTO vehicles VALUES (?,?,?,?,?,?,?,?,?,?,?)", _shifted_vehicles())
        cur.executemany("INSERT INTO service_records VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", _shifted_service_records())
        cur.executemany("INSERT INTO service_packages VALUES (?,?,?,?,?,?,?)", SERVICE_PACKAGES)
        cur.executemany("INSERT INTO parts VALUES (?,?,?,?,?,?,?)", PARTS)
        conn.commit()
        log.info(f"Database seeded: {len(CUSTOMERS)} customers, {len(VEHICLES)} vehicles, {len(SERVICE_RECORDS)} service records")
    else:
        log.info("Database already seeded")

    conn.close()


# ---------------------------------------------------------------------------
# Safe query execution
# ---------------------------------------------------------------------------

def execute_safe_query(sql: str) -> str:
    """Execute a read-only SQL query with safety checks. Returns formatted results."""
    sql_stripped = sql.strip()
    sql_upper = sql_stripped.upper()

    # Must start with SELECT
    if not sql_upper.startswith("SELECT"):
        return "Error: Only SELECT queries are allowed."

    # Block destructive keywords (word-boundary match to avoid false positives on column names)
    for keyword in BLOCKED_KEYWORDS:
        if re.search(rf"\b{keyword}\b", sql_upper):
            return f"Error: {keyword} operations are not allowed."

    # Block semicolons mid-query (prevent multi-statement injection)
    if ";" in sql_stripped[:-1]:
        return "Error: Multiple statements are not allowed."

    try:
        # Open in read-only mode
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
        conn.execute("PRAGMA query_only = ON")
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(sql_stripped.rstrip(";"))
        rows = cur.fetchmany(MAX_ROWS)

        if not rows:
            conn.close()
            return "No results found."

        # Format as readable text
        columns = rows[0].keys()
        lines = []
        lines.append(" | ".join(columns))
        lines.append("-" * len(lines[0]))
        for row in rows:
            lines.append(" | ".join(str(row[col]) if row[col] is not None else "N/A" for col in columns))

        total = cur.execute(f"SELECT COUNT(*) FROM ({sql_stripped.rstrip(';')})").fetchone()[0]
        conn.close()

        result = "\n".join(lines)
        if total > MAX_ROWS:
            result += f"\n\n(Showing {MAX_ROWS} of {total} total results)"
        return result

    except sqlite3.Error as e:
        return f"Query error: {e}"
    except Exception as e:
        return f"Error: {e}"


def get_schema_description() -> str:
    """Return a human-readable schema description for the LLM system prompt."""
    return """Database tables:

1. customers (id, name, phone, email, address, created_at)
   - Customer contact information

2. vehicles (id, customer_id, model, variant, fuel_type, year, registration_no, vin, color, purchase_date, current_mileage)
   - Customer vehicles. model = "Swift", "Baleno", "Brezza", etc.
   - fuel_type = "Petrol", "Diesel", "CNG", "Turbo Petrol", "Hybrid"
   - IMPORTANT: registration_no is stored WITH hyphens, e.g. "MH-12-AB-1234"
     Customers may say it without hyphens (e.g. "MH12AB1234").
     Always use REPLACE(registration_no, '-', '') for comparison:
     WHERE REPLACE(registration_no, '-', '') = 'MH12AB1234'

3. service_records (id, vehicle_id, service_date, service_type, description, parts_replaced, technician, status, cost, next_service_date, next_service_mileage, notes)
   - Service history. service_type = "Regular Service", "Paid Service", "Warranty Repair", "Accident Repair"
   - status = "completed", "scheduled", "in_progress"
   - parts_replaced is a JSON array of part names
   - cost = 0.00 for free services

4. service_packages (id, name, description, applicable_models, price, validity_months, includes)
   - Available service packages. includes is a JSON list.

5. parts (id, name, part_number, category, compatible_models, price, in_stock)
   - Parts catalog with pricing. category = "Engine", "Brakes", "Electrical", "Body", "Suspension", "Transmission", "AC"

Common JOINs:
- vehicles JOIN customers ON vehicles.customer_id = customers.id
- service_records JOIN vehicles ON service_records.vehicle_id = vehicles.id"""


# ---------------------------------------------------------------------------
# CLI test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init_database()

    print("\n--- Sample queries ---\n")

    print("1. All customers with Swift:")
    print(execute_safe_query("""
        SELECT c.name, c.phone, v.model, v.variant, v.year, v.registration_no
        FROM customers c JOIN vehicles v ON c.id = v.customer_id
        WHERE v.model = 'Swift'
    """))

    print("\n2. Service history for vehicle MH-12-AB-1234:")
    print(execute_safe_query("""
        SELECT sr.service_date, sr.service_type, sr.description, sr.cost, sr.status
        FROM service_records sr JOIN vehicles v ON sr.vehicle_id = v.id
        WHERE v.registration_no = 'MH-12-AB-1234'
        ORDER BY sr.service_date DESC
    """))

    print("\n3. Brake parts and prices:")
    print(execute_safe_query("SELECT name, part_number, price, compatible_models FROM parts WHERE category = 'Brakes'"))

    print("\n4. Upcoming scheduled services:")
    print(execute_safe_query("""
        SELECT v.registration_no, v.model, c.name, sr.service_date, sr.description
        FROM service_records sr
        JOIN vehicles v ON sr.vehicle_id = v.id
        JOIN customers c ON v.customer_id = c.id
        WHERE sr.status = 'scheduled'
    """))

    print("\n5. Destructive query test:")
    print(execute_safe_query("DROP TABLE customers"))
