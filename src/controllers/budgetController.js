import { getConnection } from "../config/db.js";
import oracledb from 'oracledb';

export async function getBudgetsByUserId(req, res) {
  let connection;
  try {
    const { userId } = req.params;
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT * FROM budgets WHERE user_id = :userId ORDER BY created_at DESC`,
      { userId }
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error getting budgets:", error.message, error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
}

export async function createBudget(req, res) {
  let connection;
  try {
    const { user_id, category, amount, period = "monthly" } = req.body;

    // Validate required fields
    if (!category || !user_id || amount === undefined) {
      return res.status(400).json({ message: "Category, user_id, and amount are required" });
    }

    // Validate types
    if (typeof user_id !== 'string' || typeof category !== 'string' || typeof period !== 'string') {
      return res.status(400).json({ message: "user_id, category, and period must be strings" });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      return res.status(400).json({ message: "amount must be a valid number" });
    }
    // Ensure two decimal places for NUMBER(10,2)
    const formattedAmount = Number(parsedAmount.toFixed(2));

    connection = await getConnection();

    // Check if budget exists
    const existing = await connection.execute(
      `SELECT * FROM budgets WHERE user_id = :user_id AND category = :category`,
      { user_id, category }
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Budget already exists for this category" });
    }

    const binds = {
      user_id,
      category,
      amount: formattedAmount,
      period,
      out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
    };

    console.log("Bind variables:", binds);

    // Insert and get the ID
    const result = await connection.execute(
      `INSERT INTO budgets (user_id, category, amount, period)
       VALUES (:user_id, :category, :amount, :period)
       RETURNING id INTO :out_id`,
      binds
    );

    const newId = result.outBinds.out_id[0];
    await connection.commit();

    // Fetch the inserted row
    const selectResult = await connection.execute(
      `SELECT id, user_id, category, amount, period, created_at, updated_at
       FROM budgets WHERE id = :id`,
      { id: newId }
    );

    if (selectResult.rows.length === 0) {
      return res.status(500).json({ message: "Failed to retrieve created budget" });
    }

    res.status(201).json(selectResult.rows[0]);
  } catch (error) {
    console.error("Error creating budget:", error.message, error.stack, "Request body:", req.body);
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Error rolling back transaction:", rollbackError.message, rollbackError.stack);
      }
    }
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
}

export async function updateBudget(req, res) {
  let connection;
  try {
    const { id } = req.params;
    const { category, amount, period, user_id } = req.body;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({ message: "Invalid budget ID" });
    }

    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ message: "user_id must be a string" });
    }

    // Validate types
    if ((category && typeof category !== 'string') || (period && typeof period !== 'string')) {
      return res.status(400).json({ message: "category and period must be strings" });
    }
    const parsedAmount = amount !== undefined ? parseFloat(amount) : undefined;
    if (parsedAmount !== undefined && isNaN(parsedAmount)) {
      return res.status(400).json({ message: "amount must be a valid number" });
    }
    const formattedAmount = parsedAmount !== undefined ? Number(parsedAmount.toFixed(2)) : undefined;

    connection = await getConnection();
    const binds = {
      id,
      category: category || null,
      amount: formattedAmount !== undefined ? formattedAmount : null,
      period: period || null,
      user_id,
      out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
    };

    console.log("Bind variables for update:", binds);

    const result = await connection.execute(
      `UPDATE budgets
       SET category = NVL(:category, category),
           amount = NVL(:amount, amount),
           period = NVL(:period, period),
           updated_at = SYSDATE
       WHERE id = :id AND user_id = :user_id
       RETURNING id INTO :out_id`,
      binds
    );

    await connection.commit();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "Budget not found" });
    }

    const selectResult = await connection.execute(
      `SELECT id, user_id, category, amount, period, created_at, updated_at
       FROM budgets WHERE id = :id`,
      { id }
    );

    if (selectResult.rows.length === 0) {
      return res.status(404).json({ message: "Budget not found" });
    }

    res.status(200).json(selectResult.rows[0]);
  } catch (error) {
    console.error("Error updating budget:", error.message, error.stack, "Request body:", req.body);
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Error rolling back transaction:", rollbackError.message, rollbackError.stack);
      }
    }
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
}

export async function deleteBudget(req, res) {
  let connection;
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({ message: "Invalid budget ID" });
    }

    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ message: "user_id must be a string" });
    }

    connection = await getConnection();
    const result = await connection.execute(
      `DELETE FROM budgets WHERE id = :id AND user_id = :user_id`,
      { id, user_id }
    );

    await connection.commit();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "Budget not found" });
    }

    res.status(200).json({ message: "Budget deleted successfully" });
  } catch (error) {
    console.error("Error deleting budget:", error.message, error.stack, "Request body:", req.body);
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Error rolling back transaction:", rollbackError.message, rollbackError.stack);
      }
    }
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
}

export async function getBudgetById(req, res) {
  let connection;
  try {
    const { id } = req.params;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({ message: "Invalid budget ID" });
    }

    connection = await getConnection();
    const result = await connection.execute(
      `SELECT * FROM budgets WHERE id = :id`,
      { id }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Budget not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error getting budget:", error.message, error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
}

export async function getBudgetSummaryByUserId(req, res) {
  let connection;
  try {
    const { userId } = req.params;
    connection = await getConnection();

    const totalBudget = await connection.execute(
      `SELECT NVL(SUM(amount), 0) as total FROM budgets WHERE user_id = :userId`,
      { userId }
    );

    const totalSpent = await connection.execute(
      `SELECT NVL(SUM(ABS(amount)), 0) as total
       FROM transactions
       WHERE user_id = :userId AND amount < 0`,
      { userId }
    );

    const categorySpending = await connection.execute(
      `SELECT
         b.category,
         b.amount as budget_amount,
         NVL(SUM(ABS(t.amount)), 0) as spent_amount
       FROM budgets b
       LEFT JOIN transactions t ON b.category = t.category AND t.user_id = b.user_id AND t.amount < 0
       WHERE b.user_id = :userId
       GROUP BY b.id, b.category, b.amount`,
      { userId }
    );

    res.status(200).json({
      totalBudget: totalBudget.rows[0][0],
      totalSpent: totalSpent.rows[0][0],
      remaining: totalBudget.rows[0][0] - totalSpent.rows[0][0],
      categorySpending: categorySpending.rows,
    });
  } catch (error) {
    console.error("Error getting budget summary:", error.message, error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
}

export async function getBudgetProgressByUserId(req, res) {
  let connection;
  try {
    const { userId } = req.params;
    const { period = "monthly" } = req.query;
    connection = await getConnection();

    let dateFilter = '';
    const binds = { userId };

    if (period === "weekly") {
      dateFilter = `AND t.created_at >= SYSDATE - 7`;
    } else if (period === "yearly") {
      dateFilter = `AND t.created_at >= ADD_MONTHS(SYSDATE, -12)`;
    } else {
      dateFilter = `AND t.created_at >= ADD_MONTHS(SYSDATE, -1)`;
    }

    const result = await connection.execute(
      `SELECT
         b.id,
         b.category,
         b.amount as budget_amount,
         NVL(SUM(ABS(t.amount)), 0) as spent_amount,
         CASE
           WHEN b.amount > 0 THEN (NVL(SUM(ABS(t.amount)), 0) / b.amount) * 100
           ELSE 0
         END as percentage
       FROM budgets b
       LEFT JOIN transactions t ON b.category = t.category AND t.user_id = b.user_id AND t.amount < 0
       WHERE b.user_id = :userId ${dateFilter}
       GROUP BY b.id, b.category, b.amount
       ORDER BY 5 DESC`,
      binds
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error getting budget progress:", error.message, error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
}