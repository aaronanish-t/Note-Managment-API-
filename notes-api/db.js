const { Pool } = require('pg');
require('dotenv').config();

// This uses the DATABASE_URL from your .env file!
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.connect()
  .then(() => console.log("✅ Database connected successfully!"))
  .catch(err => console.error("❌ Database connection error", err.stack));

module.exports = pool;