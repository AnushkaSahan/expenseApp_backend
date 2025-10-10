//import { sql } from "../config/db.js";
//
//export async function getTransactionsByUserId(req, res) {
//  try {
//    const { userId } = req.params;
//
//    const transactions = await sql`
//        SELECT * FROM transactions WHERE user_id = ${userId} ORDER BY created_at DESC
//      `;
//
//    res.status(200).json(transactions);
//  } catch (error) {
//    console.log("Error getting the transactions", error);
//    res.status(500).json({ message: "Internal server error" });
//  }
//}
//
//export async function createTransaction(req, res) {
//  try {
//    const { title, amount, category, user_id } = req.body;
//
//    if (!title || !user_id || !category || amount === undefined) {
//      return res.status(400).json({ message: "All fields are required" });
//    }
//
//    const transaction = await sql`
//      INSERT INTO transactions(user_id,title,amount,category)
//      VALUES (${user_id},${title},${amount},${category})
//      RETURNING *
//    `;
//
//    res.status(201).json(transaction[0]);
//  } catch (error) {
//    console.log("Error creating the transaction", error);
//    res.status(500).json({ message: "Internal server error" });
//  }
//}
//
//export async function deleteTransaction(req, res) {
//  try {
//    const { id } = req.params;
//
//    if (isNaN(parseInt(id))) {
//      return res.status(400).json({ message: "Invalid transaction ID" });
//    }
//
//    const result = await sql`
//      DELETE FROM transactions WHERE id = ${id} RETURNING *
//    `;
//
//    if (result.length === 0) {
//      return res.status(404).json({ message: "Transaction not found" });
//    }
//
//    res.status(200).json({ message: "Transaction deleted successfully" });
//  } catch (error) {
//    console.log("Error deleting the transaction", error);
//    res.status(500).json({ message: "Internal server error" });
//  }
//}
//
//export async function getSummaryByUserId(req, res) {
//  try {
//    const { userId } = req.params;
//
//    const balanceResult = await sql`
//      SELECT COALESCE(SUM(amount), 0) as balance FROM transactions WHERE user_id = ${userId}
//    `;
//
//    const incomeResult = await sql`
//      SELECT COALESCE(SUM(amount), 0) as income FROM transactions
//      WHERE user_id = ${userId} AND amount > 0
//    `;
//
//    const expensesResult = await sql`
//      SELECT COALESCE(SUM(amount), 0) as expenses FROM transactions
//      WHERE user_id = ${userId} AND amount < 0
//    `;
//
//    res.status(200).json({
//      balance: balanceResult[0].balance,
//      income: incomeResult[0].income,
//      expenses: expensesResult[0].expenses,
//    });
//  } catch (error) {
//    console.log("Error getting the summary", error);
//    res.status(500).json({ message: "Internal server error" });
//  }
//}


import { getConnection } from '../config/db.js';
import oracledb from 'oracledb'; // Already imported, but confirm

export async function getTransactionsByUserId(req, res) {
  let connection;
  try {
    const { userId } = req.params;
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT id AS "id", user_id AS "user_id", title AS "title", amount AS "amount", category AS "category", created_at AS "created_at"
       FROM transactions WHERE user_id = :userId ORDER BY created_at DESC`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT } // Return as objects
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.log("Error getting the transactions", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    if (connection) await connection.close();
  }
}

export async function createTransaction(req, res) {
  let connection;
  try {
    const { title, amount, category, user_id } = req.body;

    if (!title || !user_id || !category || amount === undefined) {
      return res.status(400).json({ message: "All fields are required" });
    }

    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO transactions (user_id, title, amount, category)
       VALUES (:user_id, :title, :amount, :category)
       RETURNING id, user_id, title, amount, category, created_at INTO :id, :user_id_out, :title_out, :amount_out, :category_out, :created_at_out`,
      {
        user_id,
        title,
        amount,
        category,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        user_id_out: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        title_out: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        amount_out: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        category_out: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
        created_at_out: { dir: oracledb.BIND_OUT, type: oracledb.DATE },
      }
    );

    console.log("Insert executed, rows affected:", result.rowsAffected); // Debug log
    await connection.commit();
    console.log("Commit successful"); // Debug log

    const transaction = {
      id: result.outBinds.id[0],
      user_id: result.outBinds.user_id_out[0],
      title: result.outBinds.title_out[0],
      amount: result.outBinds.amount_out[0],
      category: result.outBinds.category_out[0],
      created_at: result.outBinds.created_at_out[0],
    };

    res.status(201).json(transaction);
  } catch (error) {
    console.log("Error creating the transaction", error); // Log full error
    if (connection) {
      try {
        await connection.rollback(); // Rollback on error
        console.log("Transaction rolled back due to error");
      } catch (rollbackError) {
        console.log("Error rolling back transaction", rollbackError);
      }
    }
    res.status(500).json({ message: "Internal server error" });
  } finally {
    if (connection) await connection.close();
  }
}

export async function deleteTransaction(req, res) {
  let connection;
  try {
    const { id } = req.params;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    connection = await getConnection();
    const result = await connection.execute(
      `DELETE FROM transactions WHERE id = :id
       RETURNING id INTO :deleted_id`,
      {
        id: parseInt(id),
        deleted_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );

    console.log("Delete executed, rows affected:", result.rowsAffected); // Debug log
    await connection.commit();
    console.log("Commit successful"); // Debug log

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.status(200).json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.log("Error deleting the transaction", error); // Log full error
    if (connection) {
      try {
        await connection.rollback(); // Rollback on error
        console.log("Transaction rolled back due to error");
      } catch (rollbackError) {
        console.log("Error rolling back transaction", rollbackError);
      }
    }
    res.status(500).json({ message: "Internal server error" });
  } finally {
    if (connection) await connection.close();
  }
}

export async function getSummaryByUserId(req, res) {
  let connection;
  try {
    const { userId } = req.params;
    connection = await getConnection();

    const balanceResult = await connection.execute(
      `SELECT COALESCE(SUM(amount), 0) AS "balance" FROM transactions WHERE user_id = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT } // Return as objects
    );
    const incomeResult = await connection.execute(
      `SELECT COALESCE(SUM(amount), 0) AS "income" FROM transactions WHERE user_id = :userId AND amount > 0`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT } // Return as objects
    );
    const expensesResult = await connection.execute(
      `SELECT COALESCE(SUM(amount), 0) AS "expenses" FROM transactions WHERE user_id = :userId AND amount < 0`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT } // Return as objects
    );

    res.status(200).json({
      balance: balanceResult.rows[0].balance,
      income: incomeResult.rows[0].income,
      expenses: expensesResult.rows[0].expenses,
    });
  } catch (error) {
    console.log("Error getting the summary", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    if (connection) await connection.close();
  }
}