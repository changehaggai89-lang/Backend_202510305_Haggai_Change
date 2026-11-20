require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

// Hosted Render databases need SSL. Set DATABASE_SSL=false only for local testing.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false }
});

// Creates the table if missing and inserts the made-up records only once.
async function setup() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);

  const { rows } = await pool.query("SELECT COUNT(*)::int AS total FROM records");
  if (rows[0].total === 0) {
    const seed = fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8");
    await pool.query(seed);
    console.log("Starting records added.");
  }
}

module.exports = { pool, setup };
