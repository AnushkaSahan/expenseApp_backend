import oracledb from 'oracledb';
import 'dotenv/config.js';

let pool;

export async function initDB() {
  try {
    // Initialize Oracle connection pool
    pool = await oracledb.createPool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
      poolMin: 1,
      poolMax: 10,
      poolIncrement: 1,
    });

    const connection = await pool.getConnection();

    // Create transactions table
    await connection.execute(`
      BEGIN
        EXECUTE IMMEDIATE 'CREATE TABLE transactions (
          id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          user_id VARCHAR2(255) NOT NULL,
          title VARCHAR2(255) NOT NULL,
          amount NUMBER(10,2) NOT NULL,
          category VARCHAR2(255) NOT NULL,
          created_at DATE DEFAULT SYSDATE NOT NULL
        )';
      EXCEPTION
        WHEN OTHERS THEN
          IF SQLCODE != -955 THEN RAISE; END IF; -- Ignore table exists error
      END;
    `);

    // Create savings_goals table
    await connection.execute(`
      BEGIN
        EXECUTE IMMEDIATE 'CREATE TABLE savings_goals (
          id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          user_id VARCHAR2(255) NOT NULL,
          title VARCHAR2(255) NOT NULL,
          target_amount NUMBER(10,2) NOT NULL,
          current_amount NUMBER(10,2) DEFAULT 0 NOT NULL,
          icon VARCHAR2(50) DEFAULT ''target'' NOT NULL,
          target_date DATE,
          created_at DATE DEFAULT SYSDATE NOT NULL,
          updated_at DATE DEFAULT SYSDATE NOT NULL
        )';
      EXCEPTION
        WHEN OTHERS THEN
          IF SQLCODE != -955 THEN RAISE; END IF;
      END;
    `);

    // Create budgets table
    await connection.execute(`
      BEGIN
        EXECUTE IMMEDIATE 'CREATE TABLE budgets (
          id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          user_id VARCHAR2(255) NOT NULL,
          category VARCHAR2(255) NOT NULL,
          amount NUMBER(10,2) NOT NULL,
          period VARCHAR2(20) DEFAULT ''monthly'' NOT NULL,
          created_at DATE DEFAULT SYSDATE NOT NULL,
          updated_at DATE DEFAULT SYSDATE NOT NULL
        )';
      EXCEPTION
        WHEN OTHERS THEN
          IF SQLCODE != -955 THEN RAISE; END IF;
      END;
    `);

    // Create indexes
    await connection.execute(`
      BEGIN
        EXECUTE IMMEDIATE 'CREATE INDEX idx_transactions_user_id ON transactions(user_id)';
      EXCEPTION
        WHEN OTHERS THEN
          IF SQLCODE != -955 THEN RAISE; END IF;
      END;
    `);
    await connection.execute(`
      BEGIN
        EXECUTE IMMEDIATE 'CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC)';
      EXCEPTION
        WHEN OTHERS THEN
          IF SQLCODE != -955 THEN RAISE; END IF;
      END;
    `);
    await connection.execute(`
      BEGIN
        EXECUTE IMMEDIATE 'CREATE INDEX idx_savings_goals_user_id ON savings_goals(user_id)';
      EXCEPTION
        WHEN OTHERS THEN
          IF SQLCODE != -955 THEN RAISE; END IF;
      END;
    `);
    await connection.execute(`
      BEGIN
        EXECUTE IMMEDIATE 'CREATE INDEX idx_budgets_user_id ON budgets(user_id)';
      EXCEPTION
        WHEN OTHERS THEN
          IF SQLCODE != -955 THEN RAISE; END IF;
      END;
    `);

    console.log("Database initialized successfully");
    await connection.close();
  } catch (error) {
    console.error("Error initializing DB:", error.message, error.stack);
    if (error.errorNum) console.error("DB Error Code:", error.errorNum);
    process.exit(1);
  }
}

export async function getConnection() {
  if (!pool) {
    throw new Error("Pool not initialized. Call initDB first.");
  }
  return await pool.getConnection();
}