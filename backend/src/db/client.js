import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Use the connection string you pasted earlier (ensure it's in .env)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // <--- THIS IS REQUIRED FOR VERCEL + SUPABASE
  }
});

// Helper for running queries
export const query = (text, params) => pool.query(text, params);