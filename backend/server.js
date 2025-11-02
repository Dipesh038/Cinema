const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
// Load environment variables from backend/config.env explicitly
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Session (simple memory store; fine for dev)
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret_change_me';
app.use(
    session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: { httpOnly: true, sameSite: 'lax' }
    })
);

// Serve static files from the frontend directories using absolute paths
const FRONTEND_PUBLIC = path.join(__dirname, '../frontend/public');
const FRONTEND_SRC = path.join(__dirname, '../frontend/src');
const FRONTEND_AUTH = path.join(__dirname, '../frontend/auth');
app.use(express.static(FRONTEND_PUBLIC));
app.use('/src', express.static(FRONTEND_SRC));
app.use('/auth', express.static(FRONTEND_AUTH));

// MySQL Database Configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'Cinema',
    port: process.env.DB_PORT || 3306
};

let pool;

// Ensure database exists before creating pool and starting server
async function ensureDatabaseExists() {
    const { database, ...configWithoutDb } = dbConfig;
    return new Promise((resolve, reject) => {
        const conn = mysql.createConnection(configWithoutDb);
        conn.query(
            'CREATE DATABASE IF NOT EXISTS ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
            [database],
            (err) => {
                conn.end();
                if (err) return reject(err);
                console.log(`🛠️  Ensured database exists: ${database}`);
                resolve();
            }
        );
    });
}

async function start() {
    try {
        await ensureDatabaseExists();
        // Create MySQL connection pool
        pool = mysql.createPool({
            ...dbConfig,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            timezone: '+05:30' // Explicitly set IST timezone
        });

        // Test database connection and initialize schema
        pool.getConnection(async (err, connection) => {
            if (err) {
                console.error('❌ Database connection failed:', err.message);
                process.exit(1);
            }
            console.log('✅ Database connected successfully');
            try {
                await initializeSchema(connection);
                console.log('🗄️  Database schema ensured');
            } catch (e) {
                console.error('❌ Failed to initialize schema:', e);
                process.exit(1);
            } finally {
                connection.release();
            }

            // Start server only after DB is ready
            app.listen(PORT, () => {
                console.log(`🚀 Movie Booking API server running on port ${PORT}`);
                console.log(`📱 Frontend: http://localhost:${PORT}`);
                console.log(`🔧 Admin Panel: http://localhost:${PORT}/admin`);
                console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
            });
        });
    } catch (e) {
        console.error('❌ Failed during startup:', e);
        process.exit(1);
    }
}

async function initializeSchema(conn) {
    // Create movies table matching database_setup.sql
    await queryAsync(conn, `
        CREATE TABLE IF NOT EXISTS movies (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            show_date DATE NOT NULL,
            show_time TIME NOT NULL,
            language VARCHAR(100) DEFAULT 'English',
            format VARCHAR(50) DEFAULT '2D',
            price DECIMAL(10,2) NOT NULL DEFAULT 0,
            picture VARCHAR(500) DEFAULT 'https://via.placeholder.com/300x400',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Screens: defines seat grid for a screen
    await queryAsync(conn, `
        CREATE TABLE IF NOT EXISTS screens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            row_count INT NOT NULL DEFAULT 7,
            col_count INT NOT NULL DEFAULT 12,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Shows: per-movie show instances on a screen with date/time/format
    await queryAsync(conn, `
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Seats per show
    await queryAsync(conn, `
        CREATE TABLE IF NOT EXISTS show_seats (
            id INT AUTO_INCREMENT PRIMARY KEY,
            show_id INT NOT NULL,
            seat_number VARCHAR(10) NOT NULL,
            status ENUM('available','booked') DEFAULT 'available',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_show_seat (show_id, seat_number),
            CONSTRAINT fk_showseats_show FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Seats table: seats per movie with status and uniqueness per movie (legacy movie-based seating)
    await queryAsync(conn, `
        CREATE TABLE IF NOT EXISTS seats (
            seat_id INT AUTO_INCREMENT PRIMARY KEY,
            movie_id INT NOT NULL,
            seat_number VARCHAR(10) NOT NULL,
            status ENUM('available','booked') DEFAULT 'available',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_movie_seat (movie_id, seat_number),
            CONSTRAINT fk_seats_movie FOREIGN KEY (movie_id)
                REFERENCES movies(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create bookings table (now supports optional show_id)
    await queryAsync(conn, `
        CREATE TABLE IF NOT EXISTS bookings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            movie_id INT NOT NULL,
            show_id INT NULL,
            seats VARCHAR(500) NOT NULL,
            total_price DECIMAL(10,2) NOT NULL,
            booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_bookings_movie
                FOREIGN KEY (movie_id) REFERENCES movies(id)
                ON DELETE CASCADE,
            CONSTRAINT fk_bookings_show
                FOREIGN KEY (show_id) REFERENCES shows(id)
                ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Users table: manage users by username/email/password/role
    await queryAsync(conn, `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            name VARCHAR(255),
            email VARCHAR(255) UNIQUE,
            password_hash VARCHAR(255),
            role ENUM('user','admin') DEFAULT 'user',
            password_reset_token VARCHAR(255),
            password_reset_expires DATETIME,
            phone VARCHAR(50),
            is_blocked TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_active TIMESTAMP NULL DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Notifications table: store admin-sent notifications
    await queryAsync(conn, `
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255), -- null implies broadcast to all
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            delivered TINYINT(1) DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // --- Lightweight migrations for existing databases ---
    // Ensure movies.classic_price and prime_price exist for per-movie pricing
    try {
        const classicPriceCheck = await queryAsync(conn, `
            SELECT COUNT(*) AS cnt
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'movies' AND COLUMN_NAME = 'classic_price'
        `, [dbConfig.database]);
        if (!classicPriceCheck[0] || Number(classicPriceCheck[0].cnt) === 0) {
            await queryAsync(conn, `ALTER TABLE movies ADD COLUMN classic_price DECIMAL(10,2) DEFAULT 381.36 AFTER price`);
            await queryAsync(conn, `ALTER TABLE movies ADD COLUMN prime_price DECIMAL(10,2) DEFAULT 481.36 AFTER classic_price`);
        }
    } catch (e) { console.error('Migration classic_price/prime_price failed:', e); }

    // Ensure bookings.show_id exists and has FK, for older schemas created before shows were introduced
    try {
        const colCheck = await queryAsync(conn, `
            SELECT COUNT(*) AS cnt
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'show_id'
        `, [dbConfig.database]);
        if (!colCheck[0] || Number(colCheck[0].cnt) === 0) {
            await queryAsync(conn, `ALTER TABLE bookings ADD COLUMN show_id INT NULL AFTER movie_id`);
        }
    } catch (e) {
        console.warn('Note: ensure show_id column error (non-fatal):', e.message || e);
    }
    
    // Ensure bookings.user_id exists (for logged-in users)
    try {
        const userIdCheck = await queryAsync(conn, `
            SELECT COUNT(*) AS cnt
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'user_id'
        `, [dbConfig.database]);
        if (!userIdCheck[0] || Number(userIdCheck[0].cnt) === 0) {
            await queryAsync(conn, `ALTER TABLE bookings ADD COLUMN user_id INT NULL AFTER username`);
            console.log('✅ Added user_id column to bookings table');
        }
    } catch (e) {
        console.warn('Note: ensure user_id column error (non-fatal):', e.message || e);
    }
    
    // Ensure bookings.user_email exists (for reference)
    try {
        const userEmailCheck = await queryAsync(conn, `
            SELECT COUNT(*) AS cnt
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'user_email'
        `, [dbConfig.database]);
        if (!userEmailCheck[0] || Number(userEmailCheck[0].cnt) === 0) {
            await queryAsync(conn, `ALTER TABLE bookings ADD COLUMN user_email VARCHAR(255) NULL AFTER user_id`);
            console.log('✅ Added user_email column to bookings table');
        }
    } catch (e) {
        console.warn('Note: ensure user_email column error (non-fatal):', e.message || e);
    }
    
    try {
        // Try to add FK if not present
        const fkCheck = await queryAsync(conn, `
            SELECT COUNT(*) AS cnt
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bookings' AND REFERENCED_TABLE_NAME = 'shows' AND COLUMN_NAME = 'show_id'
        `, [dbConfig.database]);
        if (!fkCheck[0] || Number(fkCheck[0].cnt) === 0) {
            await queryAsync(conn, `ALTER TABLE bookings ADD CONSTRAINT fk_bookings_show FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE SET NULL`);
        }
    } catch (e) {
        console.warn('Note: ensure fk_bookings_show error (non-fatal):', e.message || e);
    }

    // Migrations: add users.email unique, password_hash, role, password reset columns if missing
    const userMigrations = [
        { col: 'email', sql: "ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE AFTER name" },
        { col: 'password_hash', sql: "ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) AFTER email" },
        { col: 'role', sql: "ALTER TABLE users ADD COLUMN role ENUM('user','admin') DEFAULT 'user' AFTER password_hash" },
        { col: 'password_reset_token', sql: "ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255) AFTER role" },
        { col: 'password_reset_expires', sql: "ALTER TABLE users ADD COLUMN password_reset_expires DATETIME AFTER password_reset_token" }
    ];
    for (const m of userMigrations) {
        try {
            const col = await queryAsync(conn, `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`, [dbConfig.database, m.col]);
            if (!col[0] || Number(col[0].cnt) === 0) {
                await queryAsync(conn, m.sql);
            }
        } catch (e) {
            console.warn(`Note: ensure users.${m.col} error (non-fatal):`, e.message || e);
        }
    }

    // Seed admin if configured via env
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (adminEmail && adminPassword) {
            const exist = await queryAsync(conn, 'SELECT id FROM users WHERE email = ? LIMIT 1', [adminEmail]);
            if (!exist.length) {
                const hash = await bcrypt.hash(adminPassword, 10);
                await queryAsync(conn, 'INSERT INTO users (username, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)', [adminEmail, 'Admin', adminEmail, hash, 'admin']);
                console.log('👤 Seeded admin user from env');
            }
        }
    } catch (e) {
        console.warn('Admin seed note:', e.message || e);
    }
}

function queryAsync(conn, sql, params = []) {
    return new Promise((resolve, reject) => {
        conn.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

// ===== ADMIN PANEL ROUTES =====

// Get movies (optionally include inactive with ?all=1)
app.get('/api/movies', (req, res) => {
    const includeAll = String(req.query.all || '') === '1';
    const query = includeAll
        ? 'SELECT * FROM movies ORDER BY title'
        : 'SELECT * FROM movies WHERE is_active = 1 ORDER BY title';
    pool.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching movies:', err);
            return res.status(500).json({ error: 'Failed to fetch movies' });
        }
        const movies = results.map(movie => ({
            id: movie.id,
            name: movie.title, // Use title from DB for both name and title properties
            title: movie.title,
            show_date: movie.show_date, // Return the actual stored date
            show_time: movie.show_time,
            showtime: movie.show_time, // Keep for frontend compatibility
            language: movie.language,
            format: movie.format,
            price: parseFloat(movie.price),
            classic_price: movie.classic_price !== undefined ? parseFloat(movie.classic_price) : 381.36,
            prime_price: movie.prime_price !== undefined ? parseFloat(movie.prime_price) : 481.36,
            picture: movie.picture,
            is_active: movie.is_active
        }));
        res.json(movies);
    });
});

// Update classic/prime prices globally for all active movies
app.post('/api/movies/prices', (req, res) => {
    const { classic_price, prime_price } = req.body || {};
    const cp = parseFloat(classic_price);
    const pp = parseFloat(prime_price);
    if (!isFinite(cp) || !isFinite(pp) || cp < 0 || pp < 0) {
        return res.status(400).json({ error: 'Invalid classic or prime price' });
    }
    const sql = 'UPDATE movies SET classic_price = ?, prime_price = ? WHERE is_active = 1';
    pool.query(sql, [cp, pp], (err, result) => {
        if (err) {
            console.error('Error updating global prices:', err);
            return res.status(500).json({ error: 'Failed to update prices' });
        }
        res.json({ success: true, updated: result.affectedRows });
    });
});

// ===== AUTH ROUTES =====
function sanitizeEmail(s){ return String(s||'').trim().toLowerCase(); }

app.post('/api/auth/signup', async (req,res)=>{
    const { name, email, password } = req.body || {};
    const e = sanitizeEmail(email);
    if (!name || !e || !password || password.length < 6) return res.status(400).json({ error: 'Invalid input' });
    try {
        const exist = await new Promise((resolve,reject)=> pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [e], (err,rows)=> err?reject(err):resolve(rows)));
        if (exist.length) return res.status(409).json({ error: 'Email already registered' });
        const hash = await bcrypt.hash(password, 10);
        await new Promise((resolve,reject)=> pool.query('INSERT INTO users (username, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)', [e, name, e, hash, 'user'], (err)=> err?reject(err):resolve()));
        res.json({ success: true });
    } catch (err) {
        console.error('Signup failed:', err);
        res.status(500).json({ error: 'Signup failed' });
    }
});

app.post('/api/auth/login', async (req,res)=>{
    const { email, password } = req.body || {};
    const e = sanitizeEmail(email);
    if (!e || !password) return res.status(400).json({ error: 'Invalid input' });
    try {
        const rows = await new Promise((resolve,reject)=> pool.query('SELECT id, name, email, password_hash, role, is_blocked FROM users WHERE email = ? LIMIT 1', [e], (err,rows)=> err?reject(err):resolve(rows)));
        if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
        const u = rows[0];
        if (u.is_blocked) return res.status(403).json({ error: 'Account is blocked' });
        const ok = await bcrypt.compare(password, u.password_hash || '');
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
        if (u.role !== 'user') return res.status(403).json({ error: 'Use admin login' });
        req.session.user = { id: u.id, name: u.name, email: u.email, role: u.role };
        res.json({ success: true, user: req.session.user });
    } catch (err) { console.error('Login failed:', err); res.status(500).json({ error: 'Login failed' }); }
});

app.post('/api/auth/admin/signup', async (req,res)=>{
    const { name, email, password, adminSecret } = req.body || {};
    const e = sanitizeEmail(email);
    // Require admin secret for creating admin accounts
    const ADMIN_SECRET = process.env.ADMIN_SIGNUP_SECRET || 'admin_secret_change_me';
    if (adminSecret !== ADMIN_SECRET) return res.status(403).json({ error: 'Invalid admin secret' });
    if (!name || !e || !password || password.length < 6) return res.status(400).json({ error: 'Invalid input' });
    try {
        const exist = await new Promise((resolve,reject)=> pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [e], (err,rows)=> err?reject(err):resolve(rows)));
        if (exist.length) return res.status(409).json({ error: 'Email already registered' });
        const hash = await bcrypt.hash(password, 10);
        await new Promise((resolve,reject)=> pool.query('INSERT INTO users (username, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)', [e, name, e, hash, 'admin'], (err)=> err?reject(err):resolve()));
        res.json({ success: true });
    } catch (err) {
        console.error('Admin signup failed:', err);
        res.status(500).json({ error: 'Admin signup failed' });
    }
});

app.post('/api/auth/admin/login', async (req,res)=>{
    const { email, password } = req.body || {};
    const e = sanitizeEmail(email);
    if (!e || !password) return res.status(400).json({ error: 'Invalid input' });
    try {
        const rows = await new Promise((resolve,reject)=> pool.query('SELECT id, name, email, password_hash, role, is_blocked FROM users WHERE email = ? LIMIT 1', [e], (err,rows)=> err?reject(err):resolve(rows)));
        if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
        const u = rows[0];
        if (u.is_blocked) return res.status(403).json({ error: 'Account is blocked' });
        const ok = await bcrypt.compare(password, u.password_hash || '');
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
        if (u.role !== 'admin') return res.status(403).json({ error: 'Not an admin account' });
        req.session.user = { id: u.id, name: u.name, email: u.email, role: u.role };
        res.json({ success: true, user: req.session.user });
    } catch (err) { console.error('Admin login failed:', err); res.status(500).json({ error: 'Login failed' }); }
});

app.post('/api/auth/logout', (req,res)=>{
    req.session.destroy(()=>{
        res.json({ success: true });
    });
});

app.get('/api/auth/me', (req,res)=>{
    res.json({ user: req.session.user || null });
});

app.post('/api/auth/forgot', async (req,res)=>{
    const { email } = req.body || {};
    const e = sanitizeEmail(email);
    if (!e) return res.status(400).json({ error: 'Email required' });
    try {
        const token = crypto.randomBytes(24).toString('hex');
        const expires = new Date(Date.now() + 60*60*1000); // 1 hour
        await new Promise((resolve,reject)=> pool.query('UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE email = ?', [token, expires, e], (err)=> err?reject(err):resolve()));
        // In real app, email the token link. For dev, return it.
        res.json({ success: true, token });
    } catch (err) { console.error('Forgot failed:', err); res.status(500).json({ error: 'Failed to start reset' }); }
});

app.post('/api/auth/reset', async (req,res)=>{
    const { email, token, password } = req.body || {};
    const e = sanitizeEmail(email);
    if (!e || !token || !password || password.length < 6) return res.status(400).json({ error: 'Invalid input' });
    try {
        const rows = await new Promise((resolve,reject)=> pool.query('SELECT id, password_reset_token, password_reset_expires FROM users WHERE email = ? LIMIT 1', [e], (err,rows)=> err?reject(err):resolve(rows)));
        if (!rows.length) return res.status(400).json({ error: 'Invalid token' });
        const u = rows[0];
        if (!u.password_reset_token || u.password_reset_token !== token) return res.status(400).json({ error: 'Invalid token' });
        if (u.password_reset_expires && new Date(u.password_reset_expires).getTime() < Date.now()) return res.status(400).json({ error: 'Token expired' });
        const hash = await bcrypt.hash(password, 10);
        await new Promise((resolve,reject)=> pool.query('UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE email = ?', [hash, e], (err)=> err?reject(err):resolve()));
        res.json({ success: true });
    } catch (err) { console.error('Reset failed:', err); res.status(500).json({ error: 'Reset failed' }); }
});

// Add new movie
app.post('/api/movies', (req, res) => {
    const { title, show_date, show_time, language = 'English', format = '2D', price, picture, classic_price, prime_price } = req.body;
    
    if (!title || !show_date || !show_time || price === undefined) {
        return res.status(400).json({ error: 'Missing required fields: title, show_date, show_time, and price are required' });
    }
    
    // Default prices if not provided
    const classicPriceValue = classic_price !== undefined ? classic_price : 381.36;
    const primePriceValue = prime_price !== undefined ? prime_price : 481.36;
    
    // Truncate picture URL if too long (max 255 chars for database)
    const truncatedPicture = picture && picture.length > 255 ? picture.substring(0, 252) + '...' : picture;
    
    // Compensate for timezone conversion by adding one day
    // When we send "2025-10-27", MySQL stores it as "2025-10-26" due to timezone conversion
    // So we add one day to get the correct date
    const dateObj = new Date(show_date);
    dateObj.setDate(dateObj.getDate() + 1);
    const adjustedDate = dateObj.toISOString().split('T')[0];
    
    // First try: insert into schemas that have a 'name' column (legacy DBs)
    const insertWithName = `
        INSERT INTO movies (title, name, language, format, price, classic_price, prime_price, picture, show_time, show_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const valuesWithName = [title, title, language, format, price, classicPriceValue, primePriceValue, truncatedPicture || 'https://via.placeholder.com/300x400', show_time, adjustedDate];

    const insertWithoutName = `
        INSERT INTO movies (title, language, format, price, classic_price, prime_price, picture, show_time, show_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const valuesWithoutName = [title, language, format, price, classicPriceValue, primePriceValue, truncatedPicture || 'https://via.placeholder.com/300x400', show_time, adjustedDate];

    pool.query(insertWithName, valuesWithName, async (err, result) => {
        if (err) {
            // If the error is because 'name' column doesn't exist, fallback to insertWithoutName
            if (err.code === 'ER_BAD_FIELD_ERROR' || /Unknown column 'name'/.test(err.sqlMessage || '')) {
                pool.query(insertWithoutName, valuesWithoutName, async (err2, result2) => {
                    if (err2) {
                        console.error('Error adding movie:', err2);
                        return res.status(500).json({ error: 'Failed to add movie' });
                    }
                    const movieId = result2.insertId;
                    try { await generateDefaultSeats(movieId); } catch (e) { console.error('Warning seat gen:', e); }
                    return res.json({ success: true, movieId });
                });
                return;
            }
            console.error('Error adding movie:', err);
            return res.status(500).json({ error: 'Failed to add movie' });
        }
        const movieId = result.insertId;
        try { await generateDefaultSeats(movieId); } catch (e) { console.error('Warning seat gen:', e); }
        res.json({ success: true, movieId });
    });
});

// Helper: generate default seats for a movie (rows A-G, 12 seats each)
function generateDefaultSeats(movieId, config) {
    return new Promise((resolve, reject) => {
        const rows = (config && config.rows) || [
            { labelFrom: 'A', labelTo: 'C', count: 12 }, // classic
            { labelFrom: 'D', labelTo: 'G', count: 12 }  // prime
        ];
        const seatsToInsert = [];
        const pushRow = (startChar, endChar, perRow) => {
            for (let code = startChar.charCodeAt(0); code <= endChar.charCodeAt(0); code++) {
                const row = String.fromCharCode(code);
                for (let num = 1; num <= perRow; num++) {
                    seatsToInsert.push([movieId, `${row}${num}`, 'available']);
                }
            }
        };
        rows.forEach(r => pushRow(r.labelFrom, r.labelTo, r.count));
        if (seatsToInsert.length === 0) return resolve();
        const sql = 'INSERT IGNORE INTO seats (movie_id, seat_number, status) VALUES ?';
        pool.query(sql, [seatsToInsert], (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

// Update movie
app.put('/api/movies/:id', (req, res) => {
    const movieId = req.params.id;
    const { title, show_date, show_time, language, format, price, picture, classic_price, prime_price } = req.body;
    const query = `
        UPDATE movies
        SET title = ?, language = ?, format = ?, price = ?, classic_price = ?, prime_price = ?, picture = ?, show_time = ?, show_date = ?
        WHERE id = ?
    `;
    const values = [title, language, format, price, classic_price || 381.36, prime_price || 481.36, picture, show_time, show_date, movieId];
    pool.query(query, values, (err, result) => {
        if (err) {
            console.error('Error updating movie:', err);
            return res.status(500).json({ error: 'Failed to update movie' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        res.json({ success: true });
    });
});

// Delete movie (soft delete)
app.delete('/api/movies/:id', (req, res) => {
    const movieId = req.params.id;
    const query = 'UPDATE movies SET is_active = 0 WHERE id = ?';
    pool.query(query, [movieId], (err, result) => {
        if (err) {
            console.error('Error deleting movie:', err);
            return res.status(500).json({ error: 'Failed to delete movie' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        res.json({ success: true });
    });
});

// Get single movie
app.get('/api/movies/:id', (req, res) => {
    const movieId = req.params.id;
    const query = 'SELECT * FROM movies WHERE id = ? AND is_active = 1';
    pool.query(query, [movieId], (err, results) => {
        if (err) {
            console.error('Error fetching movie:', err);
            return res.status(500).json({ error: 'Failed to fetch movie' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        const movie = results[0];
        res.json({
            id: movie.id,
            name: movie.title,
            title: movie.title,
            show_date: movie.show_date,
            show_time: movie.show_time,
            showtime: movie.show_time, // Keep for frontend compatibility
            language: movie.language,
            format: movie.format,
            price: parseFloat(movie.price),
            classic_price: movie.classic_price !== undefined ? parseFloat(movie.classic_price) : 381.36,
            prime_price: movie.prime_price !== undefined ? parseFloat(movie.prime_price) : 481.36,
            picture: movie.picture
        });
    });
});

// ===== BOOKING ROUTES =====

// Create new booking
app.post('/api/bookings', (req, res) => {
    const { username, user_id, user_email, movie_id, show_id, seats, total_price } = req.body;
    if (!username || !movie_id || !seats || total_price === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const seatList = String(seats)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    if (seatList.length === 0) {
        return res.status(400).json({ error: 'No seats provided' });
    }

    // Check if user is blocked
    pool.query('SELECT is_blocked FROM users WHERE username = ? LIMIT 1', [username], (blkErr, blkRows) => {
        if (blkErr) {
            console.error('User check error:', blkErr);
            return res.status(500).json({ error: 'Database error' });
        }
        if (blkRows.length > 0 && blkRows[0].is_blocked) {
            return res.status(403).json({ error: 'User is blocked from booking' });
        }

        // Proceed with transactional booking
    pool.getConnection((err, conn) => {
        if (err) {
            console.error('DB connection error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        conn.beginTransaction(async (txErr) => {
            if (txErr) {
                conn.release();
                console.error('Transaction error:', txErr);
                return res.status(500).json({ error: 'Transaction start failed' });
            }
            try {
                // Check seat availability: prefer show_seats when show_id provided
                const placeholders = seatList.map(() => '?').join(',');
                const checkSql = show_id
                    ? `SELECT seat_number FROM show_seats WHERE show_id = ? AND seat_number IN (${placeholders}) AND status = 'booked' FOR UPDATE`
                    : `SELECT seat_number FROM seats WHERE movie_id = ? AND seat_number IN (${placeholders}) AND status = 'booked' FOR UPDATE`;
                const checkParams = [show_id || movie_id, ...seatList];
                const booked = await new Promise((resolve, reject) => {
                    conn.query(checkSql, checkParams, (e, rows) => e ? reject(e) : resolve(rows));
                });
                if (booked.length > 0) {
                    await new Promise((resolve) => conn.rollback(() => resolve()));
                    conn.release();
                    return res.status(409).json({ error: 'Some seats are already booked', seats: booked.map(r => r.seat_number) });
                }

                // Insert booking
                const insertSql = `INSERT INTO bookings (username, user_id, user_email, movie_id, show_id, seats, total_price) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                const result = await new Promise((resolve, reject) => {
                    conn.query(insertSql, [username, user_id || null, user_email || null, movie_id, show_id || null, seats, total_price], (e, r) => e ? reject(e) : resolve(r));
                });

                // Mark seats as booked
                if (show_id) {
                    const updateSqlShow = `UPDATE show_seats SET status = 'booked' WHERE show_id = ? AND seat_number IN (${placeholders})`;
                    await new Promise((resolve, reject) => {
                        conn.query(updateSqlShow, [show_id, ...seatList], (e) => e ? reject(e) : resolve());
                    });
                } else {
                    const updateSql = `UPDATE seats SET status = 'booked' WHERE movie_id = ? AND seat_number IN (${placeholders})`;
                    await new Promise((resolve, reject) => {
                        conn.query(updateSql, [movie_id, ...seatList], (e) => e ? reject(e) : resolve());
                    });
                }

                // Upsert user record and update last_active
                await new Promise((resolve, reject) => {
                    const upsert = `INSERT INTO users (username, last_active) VALUES (?, NOW())
                                    ON DUPLICATE KEY UPDATE last_active = NOW()`;
                    conn.query(upsert, [username], (e) => e ? reject(e) : resolve());
                });

                // Commit
                await new Promise((resolve, reject) => {
                    conn.commit((e) => e ? reject(e) : resolve());
                });
                conn.release();
                res.json({ success: true, bookingId: result.insertId });
            } catch (e) {
                console.error('Booking failed:', e);
                await new Promise((resolve) => conn.rollback(() => resolve()));
                conn.release();
                res.status(500).json({ error: 'Failed to create booking' });
            }
        });
    });
    });
});

// ===== SEAT MANAGEMENT ROUTES =====

// Get seats for a movie
app.get('/api/movies/:id/seats', (req, res) => {
    const movieId = req.params.id;
    const sql = 'SELECT seat_id, seat_number, status FROM seats WHERE movie_id = ? ORDER BY seat_number';
    pool.query(sql, [movieId], (err, rows) => {
        if (err) {
            console.error('Error fetching seats:', err);
            return res.status(500).json({ error: 'Failed to fetch seats' });
        }
        res.json(rows);
    });
});

// Reset all seats to available
app.post('/api/movies/:id/seats/reset', (req, res) => {
    const movieId = req.params.id;
    pool.query('UPDATE seats SET status = "available" WHERE movie_id = ?', [movieId], (err) => {
        if (err) {
            console.error('Error resetting seats:', err);
            return res.status(500).json({ error: 'Failed to reset seats' });
        }
        res.json({ success: true });
    });
});

// Bulk update seat statuses
app.patch('/api/movies/:id/seats', (req, res) => {
    const movieId = req.params.id;
    const { seats } = req.body; // [{seat_number, status}]
    if (!Array.isArray(seats) || seats.length === 0) {
        return res.status(400).json({ error: 'No seats provided' });
    }
    const updates = seats.map(s => [s.status, movieId, s.seat_number]);
    const sql = 'UPDATE seats SET status = ? WHERE movie_id = ? AND seat_number = ?';
    // Execute sequentially to be simple
    const doUpdate = (i) => {
        if (i >= updates.length) return res.json({ success: true, updated: updates.length });
        pool.query(sql, updates[i], (err) => {
            if (err) {
                console.error('Error updating seat:', err);
                return res.status(500).json({ error: 'Failed to update seats' });
            }
            doUpdate(i + 1);
        });
    };
    doUpdate(0);
});

// Generate seats for a movie (e.g., add rows)
app.post('/api/movies/:id/seats/generate', async (req, res) => {
    const movieId = parseInt(req.params.id, 10);
    const { rows } = req.body; // [{labelFrom, labelTo, count}]
    try {
        await generateDefaultSeats(movieId, { rows });
        res.json({ success: true });
    } catch (e) {
        console.error('Error generating seats:', e);
        res.status(500).json({ error: 'Failed to generate seats' });
    }
});

// Get all bookings
app.get('/api/bookings', (req, res) => {
    const query = `
        SELECT b.id, b.username, b.movie_id, b.show_id, b.seats, b.total_price, b.booking_time,
               m.title AS movie_title,
               s.show_date, s.show_time, s.format
        FROM bookings b
        JOIN movies m ON b.movie_id = m.id
        LEFT JOIN shows s ON b.show_id = s.id
        ORDER BY b.booking_time DESC
    `;
    pool.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching bookings:', err);
            return res.status(500).json({ error: 'Failed to fetch bookings' });
        }
        res.json(results);
    });
});

// Delete booking and free seats
app.delete('/api/bookings/:id', (req, res) => {
    const bookingId = parseInt(req.params.id, 10);
    if (isNaN(bookingId)) return res.status(400).json({ error: 'Invalid booking id' });

    pool.getConnection((err, conn) => {
        if (err) {
            console.error('DB connection error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        conn.beginTransaction(async (txErr) => {
            if (txErr) {
                conn.release();
                return res.status(500).json({ error: 'Transaction start failed' });
            }
            try {
                const booking = await new Promise((resolve, reject) => {
                    conn.query('SELECT movie_id, show_id, seats FROM bookings WHERE id = ? FOR UPDATE', [bookingId], (e, rows) => e ? reject(e) : resolve(rows[0]));
                });
                if (!booking) {
                    await new Promise((resolve) => conn.rollback(() => resolve()));
                    conn.release();
                    return res.status(404).json({ error: 'Booking not found' });
                }
                const seatList = booking.seats.split(',').map(s => s.trim()).filter(Boolean);
                if (seatList.length) {
                    const placeholders = seatList.map(() => '?').join(',');
                    if (booking.show_id) {
                        await new Promise((resolve, reject) => {
                            conn.query(`UPDATE show_seats SET status = 'available' WHERE show_id = ? AND seat_number IN (${placeholders})`, [booking.show_id, ...seatList], (e) => e ? reject(e) : resolve());
                        });
                    } else {
                        await new Promise((resolve, reject) => {
                            conn.query(`UPDATE seats SET status = 'available' WHERE movie_id = ? AND seat_number IN (${placeholders})`, [booking.movie_id, ...seatList], (e) => e ? reject(e) : resolve());
                        });
                    }
                }
                await new Promise((resolve, reject) => {
                    conn.query('DELETE FROM bookings WHERE id = ?', [bookingId], (e) => e ? reject(e) : resolve());
                });
                await new Promise((resolve, reject) => {
                    conn.commit((e) => e ? reject(e) : resolve());
                });
                conn.release();
                res.json({ success: true });
            } catch (e) {
                console.error('Delete booking failed:', e);
                await new Promise((resolve) => conn.rollback(() => resolve()));
                conn.release();
                res.status(500).json({ error: 'Failed to delete booking' });
            }
        });
    });
});

// ===== SCREENS MANAGEMENT =====
app.get('/api/screens', (req, res) => {
    pool.query('SELECT * FROM screens ORDER BY id DESC', (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch screens' });
        res.json(rows);
    });
});

app.post('/api/screens', (req, res) => {
    const { name, rows, cols } = req.body;
    if (!name || !rows || !cols) return res.status(400).json({ error: 'name, rows, cols required' });
    pool.query('INSERT INTO screens (name, row_count, col_count) VALUES (?, ?, ?)', [name, rows, cols], (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to create screen' });
        res.json({ success: true, id: result.insertId });
    });
});

app.put('/api/screens/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { name, rows, cols } = req.body;
    pool.query('UPDATE screens SET name = ?, row_count = ?, col_count = ? WHERE id = ?', [name, rows, cols, id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to update screen' });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true });
    });
});

app.delete('/api/screens/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    pool.query('DELETE FROM screens WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to delete screen' });
        res.json({ success: true });
    });
});

// ===== SHOWS MANAGEMENT =====
app.get('/api/movies/:id/shows', (req, res) => {
    const movieId = parseInt(req.params.id, 10);
    const sql = `SELECT s.id, s.movie_id, s.screen_id, s.show_date, s.show_time, s.format,
                 sc.name AS screen_name, sc.row_count AS row_count, sc.col_count AS col_count
                 FROM shows s JOIN screens sc ON sc.id = s.screen_id
                 WHERE s.movie_id = ? ORDER BY s.show_date, s.show_time`;
    pool.query(sql, [movieId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch shows' });
        res.json(rows);
    });
});

app.get('/api/shows/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const sql = `SELECT s.*, m.title AS movie_title, m.language, m.classic_price, m.prime_price, m.picture, 
                        sc.name AS screen_name, sc.row_count AS row_count, sc.col_count AS col_count
                 FROM shows s JOIN movies m ON m.id = s.movie_id JOIN screens sc ON sc.id = s.screen_id WHERE s.id = ?`;
    pool.query(sql, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch show' });
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    });
});

// List all shows across movies
app.get('/api/shows', (req, res) => {
    const sql = `SELECT s.id, s.movie_id, s.screen_id, s.show_date, s.show_time, s.format,
                        m.title AS movie_title, m.language,
                        sc.name AS screen_name, sc.row_count AS row_count, sc.col_count AS col_count
                 FROM shows s
                 JOIN movies m ON m.id = s.movie_id
                 JOIN screens sc ON sc.id = s.screen_id
                 ORDER BY s.show_date, s.show_time`;
    pool.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch shows' });
        res.json(rows);
    });
});

app.post('/api/movies/:id/shows', async (req, res) => {
    const movieId = parseInt(req.params.id, 10);
    const { screen_id, show_date, show_time, format = '2D' } = req.body;
    if (!screen_id || !show_date || !show_time) return res.status(400).json({ error: 'screen_id, show_date, show_time required' });
    pool.getConnection(async (err, conn) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        try {
            const result = await new Promise((resolve, reject) => {
                conn.query('INSERT INTO shows (movie_id, screen_id, show_date, show_time, format) VALUES (?, ?, ?, ?, ?)', [movieId, screen_id, show_date, show_time, format], (e, r) => e ? reject(e) : resolve(r));
            });
            const showId = result.insertId;
            // Generate seats for this show according to screen rows/cols
            await generateSeatsForShow(conn, showId);
            conn.release();
            res.json({ success: true, showId });
        } catch (e) {
            conn.release();
            if (e && e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Show already exists for this time' });
            console.error('Create show failed:', e);
            res.status(500).json({ error: 'Failed to create show' });
        }
    });
});

app.delete('/api/shows/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    pool.query('DELETE FROM shows WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to delete show' });
        res.json({ success: true });
    });
});

// ===== SHOW SEATS =====
async function generateSeatsForShow(conn, showId) {
    const show = await new Promise((resolve, reject) => {
        conn.query('SELECT screen_id FROM shows WHERE id = ?', [showId], (e, rows) => e ? reject(e) : resolve(rows[0]));
    });
    const screen = await new Promise((resolve, reject) => {
        conn.query('SELECT row_count, col_count FROM screens WHERE id = ?', [show.screen_id], (e, rows) => e ? reject(e) : resolve(rows[0]));
    });
    const rows = screen.row_count; const cols = screen.col_count;
    const values = [];
    for (let r = 0; r < rows; r++) {
        const rowLabel = String.fromCharCode('A'.charCodeAt(0) + r);
        for (let c = 1; c <= cols; c++) {
            values.push([showId, `${rowLabel}${c}`, 'available']);
        }
    }
    if (values.length) {
        await new Promise((resolve, reject) => {
            conn.query('INSERT IGNORE INTO show_seats (show_id, seat_number, status) VALUES ?', [values], (e) => e ? reject(e) : resolve());
        });
    }
}

app.get('/api/shows/:id/seats', (req, res) => {
    const showId = parseInt(req.params.id, 10);
    pool.query('SELECT id, seat_number, status FROM show_seats WHERE show_id = ? ORDER BY seat_number', [showId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch seats' });
        res.json(rows);
    });
});

app.post('/api/shows/:id/seats/reset', (req, res) => {
    const showId = parseInt(req.params.id, 10);
    pool.query('UPDATE show_seats SET status = "available" WHERE show_id = ?', [showId], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to reset seats' });
        res.json({ success: true });
    });
});

app.patch('/api/shows/:id/seats', (req, res) => {
    const showId = parseInt(req.params.id, 10);
    const { seats } = req.body; // [{seat_number, status}]
    if (!Array.isArray(seats) || seats.length === 0) return res.status(400).json({ error: 'No seats provided' });
    const sql = 'UPDATE show_seats SET status = ? WHERE show_id = ? AND seat_number = ?';
    const doNext = (i) => {
        if (i >= seats.length) return res.json({ success: true, updated: seats.length });
        const s = seats[i];
        pool.query(sql, [s.status, showId, s.seat_number], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to update seats' });
            doNext(i + 1);
        });
    };
    doNext(0);
});

// ===== USERS MANAGEMENT ROUTES =====

// Sync users table from distinct booking usernames (idempotent)
app.post('/api/users/sync', (req, res) => {
    const sql = `INSERT IGNORE INTO users (username, created_at, last_active)
                 SELECT username, MIN(booking_time) AS created_at, MAX(booking_time) AS last_active
                 FROM bookings GROUP BY username`;
    pool.query(sql, (err) => {
        if (err) {
            console.error('Sync users failed:', err);
            return res.status(500).json({ error: 'Failed to sync users' });
        }
        res.json({ success: true });
    });
});

// Get users with booking counts
app.get('/api/users', (req, res) => {
    const sql = `
        SELECT u.id, u.username, u.name, u.email, u.phone, u.is_blocked, u.created_at, u.last_active,
               COALESCE(b.cnt, 0) AS booking_count
        FROM users u
        LEFT JOIN (
            SELECT username, COUNT(*) AS cnt FROM bookings GROUP BY username
        ) b ON b.username = u.username
        ORDER BY u.created_at DESC`;
    pool.query(sql, (err, rows) => {
        if (err) {
            console.error('Fetch users failed:', err);
            return res.status(500).json({ error: 'Failed to fetch users' });
        }
        res.json(rows);
    });
});

// Toggle block/unblock user
app.patch('/api/users/:id/block', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { is_blocked } = req.body;
    if (isNaN(id) || typeof is_blocked !== 'boolean') return res.status(400).json({ error: 'Invalid payload' });
    pool.query('UPDATE users SET is_blocked = ? WHERE id = ?', [is_blocked ? 1 : 0, id], (err, result) => {
        if (err) {
            console.error('Update block failed:', err);
            return res.status(500).json({ error: 'Failed to update user' });
        }
        if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true });
    });
});

// Get a user's bookings
app.get('/api/users/:id/bookings', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user id' });
    pool.query('SELECT username FROM users WHERE id = ?', [id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!rows.length) return res.status(404).json({ error: 'User not found' });
        const username = rows[0].username;
        const sql = `SELECT b.*, m.title AS movie_title, m.show_time FROM bookings b JOIN movies m ON m.id = b.movie_id WHERE b.username = ? ORDER BY b.booking_time DESC`;
        pool.query(sql, [username], (e, bookings) => {
            if (e) return res.status(500).json({ error: 'Failed to fetch bookings' });
            res.json(bookings);
        });
    });
});

// Notifications
app.post('/api/notifications', (req, res) => {
    const { message, usernames } = req.body; // usernames: array or 'all'
    if (!message || typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'Message is required' });
    if (Array.isArray(usernames) && usernames.length > 0) {
        const values = usernames.map(u => [u, message.trim()]);
        pool.query('INSERT INTO notifications (username, message) VALUES ?', [values], (err) => {
            if (err) {
                console.error('Insert notifications failed:', err);
                return res.status(500).json({ error: 'Failed to send notifications' });
            }
            res.json({ success: true, count: values.length });
        });
    } else {
        // broadcast
        pool.query('INSERT INTO notifications (username, message) VALUES (NULL, ?)', [message.trim()], (err) => {
            if (err) {
                console.error('Broadcast notification failed:', err);
                return res.status(500).json({ error: 'Failed to send notification' });
            }
            res.json({ success: true, count: 'all' });
        });
    }
});

app.get('/api/notifications', (req, res) => {
    const { username } = req.query;
    const sql = username ? 'SELECT * FROM notifications WHERE username = ? OR username IS NULL ORDER BY created_at DESC' : 'SELECT * FROM notifications ORDER BY created_at DESC';
    const params = username ? [username] : [];
    pool.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch notifications' });
        res.json(rows);
    });
});

// ===== STATS ROUTE =====
app.get('/api/stats', (req, res) => {
    const q1 = 'SELECT COUNT(*) AS movies FROM movies WHERE is_active = 1';
    const q2 = 'SELECT COUNT(*) AS bookings, COALESCE(SUM(total_price),0) AS revenue FROM bookings';
    const q3 = `SELECT 
                    SUM(booked) AS booked,
                    SUM(available) AS available
                FROM (
                    SELECT 
                        SUM(CASE WHEN status = 'booked' THEN 1 ELSE 0 END) AS booked,
                        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available
                    FROM seats
                    UNION ALL
                    SELECT 
                        SUM(CASE WHEN status = 'booked' THEN 1 ELSE 0 END) AS booked,
                        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available
                    FROM show_seats
                ) t`;
    const q4 = 'SELECT COUNT(*) AS users FROM users';
    pool.query(q1, (e1, r1) => {
        if (e1) return res.status(500).json({ error: 'Failed to fetch stats' });
        pool.query(q2, (e2, r2) => {
            if (e2) return res.status(500).json({ error: 'Failed to fetch stats' });
            pool.query(q3, (e3, r3) => {
                if (e3) return res.status(500).json({ error: 'Failed to fetch stats' });
                pool.query(q4, (e4, r4) => {
                    if (e4) return res.status(500).json({ error: 'Failed to fetch stats' });
                    res.json({
                        movies: r1[0].movies || 0,
                        bookings: r2[0].bookings || 0,
                        revenue: parseFloat(r2[0].revenue || 0),
                        seats: { booked: r3[0].booked || 0, available: r3[0].available || 0 },
                        users: r4[0].users || 0
                    });
                });
            });
        });
    });
});

// Get bookings by movie
app.get('/api/bookings/movie/:movieId', (req, res) => {
    const movieId = req.params.movieId;
    const query = `
        SELECT b.id, b.username, b.movie_id, b.booking_time,
               m.title AS movie_title
        FROM bookings b
        JOIN movies m ON b.movie_id = m.id
        WHERE b.movie_id = ?
        ORDER BY b.booking_time DESC
    `;
    pool.query(query, [movieId], (err, results) => {
        if (err) {
            console.error('Error fetching bookings:', err);
            return res.status(500).json({ error: 'Failed to fetch bookings' });
        }
        res.json(results);
    });
});

// ===== MAIN ROUTES =====
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: FRONTEND_PUBLIC });
});

// ===== ADMIN PANEL ROUTE =====
app.get('/admin', (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return res.sendFile('admin.html', { root: FRONTEND_PUBLIC });
    }
    return res.redirect('/auth/admin-login.html?redirect=/admin');
});

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Movie Booking API is running',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Kick off startup sequence
start();

module.exports = app;
