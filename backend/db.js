const mysql = require('mysql2');

// Create a connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root', // 👈 Your MySQL username
  password: 'Dkwarrier@123', // 👈 Your MySQL password
  database: 'Cinema', // 👈 Your database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log('🐘 MySQL Connection Pool created.');

// Export the promise-based pool
module.exports = pool.promise();