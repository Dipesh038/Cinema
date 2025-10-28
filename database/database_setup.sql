-- Movie Booking Database Setup
-- Run this script in your MySQL database to create the required tables

-- Create database (uncomment if you need to create the database)
-- CREATE DATABASE IF NOT EXISTS Cinema;
-- USE Cinema;

-- Movies table
CREATE TABLE IF NOT EXISTS movies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    show_date DATE NOT NULL,
    show_time TIME NOT NULL,
    language VARCHAR(100) DEFAULT 'English',
    format VARCHAR(50) DEFAULT '2D',
    price DECIMAL(10,2) NOT NULL,
    picture VARCHAR(500) DEFAULT 'https://via.placeholder.com/300x400',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Screens table: defines seat grid per screen
CREATE TABLE IF NOT EXISTS screens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    row_count INT NOT NULL DEFAULT 7,
    col_count INT NOT NULL DEFAULT 12,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shows table: per-movie shows on screens
CREATE TABLE IF NOT EXISTS shows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    movie_id INT NOT NULL,
    screen_id INT NOT NULL,
    show_date DATE NOT NULL,
    show_time TIME NOT NULL,
    format VARCHAR(50) DEFAULT '2D',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_shows_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    CONSTRAINT fk_shows_screen FOREIGN KEY (screen_id) REFERENCES screens(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_movie_screen_datetime (movie_id, screen_id, show_date, show_time)
);

-- Seats per show
CREATE TABLE IF NOT EXISTS show_seats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    show_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    status ENUM('available','booked') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_show_seat (show_id, seat_number),
    CONSTRAINT fk_showseats_show FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
);

-- Movie-based seats (legacy)
CREATE TABLE IF NOT EXISTS seats (
    seat_id INT AUTO_INCREMENT PRIMARY KEY,
    movie_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    status ENUM('available','booked') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_movie_seat (movie_id, seat_number),
    CONSTRAINT fk_seats_movie FOREIGN KEY (movie_id)
        REFERENCES movies(id) ON DELETE CASCADE
);

-- Bookings table (supports optional show_id)
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    movie_id INT NOT NULL,
    show_id INT NULL,
    seats VARCHAR(500) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bookings_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    CONSTRAINT fk_bookings_show FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE SET NULL
);

-- Users table (admin managed)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    is_blocked TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP NULL DEFAULT NULL
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255), -- NULL means broadcast to all users
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered TINYINT(1) DEFAULT 0
);

-- Insert sample movies
INSERT INTO movies (title, show_date, show_time, language, format, price, picture) VALUES
('Avengers: Endgame', '2024-01-15', '14:30:00', 'English', '3D', 450.00, 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg'),
('Spider-Man: No Way Home', '2024-01-15', '18:00:00', 'English', '2D', 380.00, 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg'),
('The Batman', '2024-01-16', '20:30:00', 'English', 'IMAX', 550.00, 'https://image.tmdb.org/t/p/w500/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg'),
('Dune', '2024-01-16', '16:45:00', 'English', '2D', 420.00, 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg'),
('No Time to Die', '2024-01-17', '19:15:00', 'English', '2D', 400.00, 'https://image.tmdb.org/t/p/w500/iUgygt3fscRoKWCV1d0C7FbM9TR.jpg');

-- Show tables
SHOW TABLES;
