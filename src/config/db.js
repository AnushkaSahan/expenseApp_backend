//import { neon } from "@neondatabase/serverless";
//
//import "dotenv/config.js";
//
//export const sql = neon(process.env.DATABASE_URL);
//
//export async function initDB() {
//  try {
//    await sql`CREATE TABLE IF NOT EXISTS transactions(
//      id SERIAL PRIMARY KEY,
//      user_id VARCHAR(255) NOT NULL,
//      title VARCHAR(255) NOT NULL,
//      amount DECIMAL(10,2) NOT NULL,
//      category VARCHAR(255) NOT NULL,
//      created_at DATE NOT NULL DEFAULT CURRENT_DATE
//    )`;
//    console.log("Database initialized successsfully");
//  } catch (error) {
//    console.log("Error initialzing DB", error);
//    process.exit(1);
//  }
//}


import oracledb from 'oracledb';
import 'dotenv/config.js';

let pool;

export async function initDB() {
  try {
    // Create connection pool
    pool = await oracledb.createPool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
      poolMin: 1,
      poolMax: 10,
      poolIncrement: 1,
    });

    const connection = await pool.getConnection();
    try {
      // Create table if not exists (Oracle syntax)
      await connection.execute(`
        CREATE TABLE transactions (
          id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          user_id VARCHAR2(255) NOT NULL,
          title VARCHAR2(255) NOT NULL,
          amount NUMBER(10,2) NOT NULL,
          category VARCHAR2(255) NOT NULL,
          created_at DATE DEFAULT SYSDATE NOT NULL
        )
      `);
      await connection.commit();
      console.log("Database initialized successfully");
    } catch (err) {
      if (err.message.includes('ORA-00955')) { // Table already exists
        console.log("Table already exists, skipping creation");
      } else {
        throw err;
      }
    } finally {
      await connection.close();
    }
  } catch (error) {
    console.log("Error initializing DB", error);
    process.exit(1);
  }
}

export async function getConnection() {
  if (!pool) {
    throw new Error("Pool not initialized. Call initDB first.");
  }
  return await pool.getConnection();
}