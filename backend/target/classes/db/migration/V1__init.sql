CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    full_name VARCHAR(255),
    title VARCHAR(255),
    facility_id VARCHAR(100),
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS mothers (
    id UUID PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    phoneNumber VARCHAR(50),
    date_of_birth DATE,
    facility_id VARCHAR(100),
    user_id UUID
);

CREATE TABLE IF NOT EXISTS newborns (
    id UUID PRIMARY KEY,
    mother_id UUID NOT NULL,
    name VARCHAR(255),
    date_of_birth DATE,
    sex VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS vital_signs (
    id UUID PRIMARY KEY,
    mother_id UUID NOT NULL,
    systolic_bp INT,
    diastolic_bp INT,
    weight_kg DOUBLE PRECISION,
    recorded_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY,
    mother_id UUID NOT NULL,
    type VARCHAR(50),
    scheduled_at TIMESTAMP,
    status VARCHAR(50)
);
