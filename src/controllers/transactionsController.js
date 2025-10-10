import { getConnection } from "../config/db.js";
import oracledb from 'oracledb';

export async function getTransactionsByUserId(req, res) {
  let connection;
  try {
    const { userId } = req.params;
    connection = await getConnection();
    const query = `
      SELECT id, user_id, title, amount, category, created_at
      FROM transactions
      WHERE user_id = :userId
      ORDER BY created_at DESC
    `;
    console.log("Executing query:", query.trim(), "with binds:", { userId });
    const result = await connection.execute(query, { userId });
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error getting transactions:", error.message, error.stack, "Params:", req.params);
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error("Error closing connection:", closeError.message, closeError.stack);
      }
    }
  }
}

export async function getSummaryByUserId(req, res) {
  let connection;
  try {
    const { userId } = req.params;
    connection = await getConnection();

    const incomeResult = await connection.execute(
      `SELECT NVL(SUM(amount), 0) AS income
       FROM transactions
       WHERE user_id = :userId AND amount > 0`,
      { userId }
    );

    const expensesResult = await connection.execute(
      `SELECT NVL(SUM(ABS(amount)), 0) AS expenses
       FROM transactions
       WHERE user_id = :userId AND amount < 0`,
      { userId }
    );

    const summary = {
      income: parseFloat(incomeResult.rows[0][0]).toFixed(2),
      expenses: parseFloat(expensesResult.rows[0][0]).toFixed(2),
    };

    res.status(200).json(summary);
  } catch (error) {
    console.error("Error getting transaction summary:", error.message, error.stack, "Params:", req.params);
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error("Error closing connection:", closeError.message, closeError.stack);
      }
    }
  }
}

export async function createTransaction(req, res) {
  let connection;
  try {
    const { user_id, title, amount, category } = req.body;

    if (!user_id || !title || amount === undefined) {
      return res.status(400).json({ message: "user_id, title, and amount are required" });
    }

    if (typeof user_id !== 'string' || typeof title !== 'string' || (category && typeof category !== 'string')) {
      return res.status(400).json({ message: "user_id, title, and category must be strings" });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      return res.status(400).json({ message: "amount must be a valid number" });
    }
    const formattedAmount = Number(parsedAmount.toFixed(2));

    connection = await getConnection();
    const binds = {
      user_id,
      title,
      amount: formattedAmount,
      category: category || null,
      out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
    };

    console.log("Create transaction binds:", binds);

    const result = await connection.execute(
      `INSERT INTO transactions (user_id, title, amount, category)
       VALUES (:user_id, :title, :amount, :category)
       RETURNING id INTO :out_id`,
      binds
    );

    const newId = result.outBinds.out_id[0];
    await connection.commit();

    const selectResult = await connection.execute(
      `SELECT id, user_id, title, amount, category, created_at
       FROM transactions WHERE id = :id`,
      { id: newId }
    );

    if (selectResult.rows.length === 0) {
      return res.status(500).json({ message: "Failed to retrieve created transaction" });
    }

    res.status(201).json(selectResult.rows[0]);
  } catch (error) {
    console.error("Error creating transaction:", error.message, error.stack, "Request body:", req.body);
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Error rolling back transaction:", rollbackError.message, rollbackError.stack);
      }
    }
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error("Error closing connection:", closeError.message, closeError.stack);
      }
    }
  }
}

export async function deleteTransaction(req, res) {
  let connection;
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ message: "user_id must be a string" });
    }

    connection = await getConnection();
    const result = await connection.execute(
      `DELETE FROM transactions WHERE id = :id AND user_id = :user_id`,
      { id, user_id }
    );

    await connection.commit();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.status(200).json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Error deleting transaction:", error.message, error.stack, "Request body:", req.body);
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Error rolling back transaction:", rollbackError.message, rollbackError.stack);
      }
    }
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error("Error closing connection:", closeError.message, closeError.stack);
      }
    }
  }
}