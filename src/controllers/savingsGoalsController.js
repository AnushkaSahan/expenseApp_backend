import oracledb from 'oracledb';
import { getConnection } from "../config/db.js";

export async function getSavingsGoalsByUserId(req, res) {
  let connection;
  try {
    const { userId } = req.params;
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT * FROM savings_goals WHERE user_id = :userId ORDER BY created_at DESC`,
      { userId }
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error getting savings goals:", error.message, error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
}

export async function createSavingsGoal(req, res) {
  let connection;
  try {
    const { user_id, title, target_amount, current_amount = 0, icon = "target", target_date } = req.body;

    // Validate required fields
    if (!title || !user_id || target_amount === undefined) {
      return res.status(400).json({ message: "Title, user_id, and target_amount are required" });
    }

    // Validate types
    if (typeof user_id !== 'string' || typeof title !== 'string' || typeof icon !== 'string') {
      return res.status(400).json({ message: "user_id, title, and icon must be strings" });
    }
    const parsedTargetAmount = parseFloat(target_amount);
    const parsedCurrentAmount = parseFloat(current_amount);
    if (isNaN(parsedTargetAmount) || isNaN(parsedCurrentAmount)) {
      return res.status(400).json({ message: "target_amount and current_amount must be valid numbers" });
    }
    // Ensure two decimal places for NUMBER(10,2)
    const formattedTargetAmount = Number(parsedTargetAmount.toFixed(2));
    const formattedCurrentAmount = Number(parsedCurrentAmount.toFixed(2));
    let formattedTargetDate = null;
    if (target_date) {
      if (typeof target_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(target_date)) {
        return res.status(400).json({ message: "target_date must be a string in YYYY-MM-DD format" });
      }
      // Convert to JavaScript Date
      formattedTargetDate = new Date(target_date);
      if (isNaN(formattedTargetDate.getTime())) {
        return res.status(400).json({ message: "Invalid target_date format" });
      }
    }

    connection = await getConnection();
    const binds = {
      user_id,
      title,
      target_amount: formattedTargetAmount,
      current_amount: formattedCurrentAmount,
      icon,
      target_date: formattedTargetDate,
    };

    console.log("Bind variables:", binds);

    // Insert and get the ID
    const insertResult = await connection.execute(
      `INSERT INTO savings_goals (user_id, title, target_amount, current_amount, icon, target_date)
       VALUES (:user_id, :title, :target_amount, :current_amount, :icon, :target_date)
       RETURNING id INTO :out_id`,
      {
        ...binds,
        out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      }
    );

    const newId = insertResult.outBinds.out_id[0];
    await connection.commit();

    // Fetch the inserted row
    const selectResult = await connection.execute(
      `SELECT id, user_id, title, target_amount, current_amount, icon, target_date, created_at, updated_at
       FROM savings_goals WHERE id = :id`,
      { id: newId }
    );

    if (selectResult.rows.length === 0) {
      return res.status(500).json({ message: "Failed to retrieve created savings goal" });
    }

    res.status(201).json(selectResult.rows[0]);
  } catch (error) {
    console.error("Error creating savings goal:", error.message, error.stack, "Request body:", req.body);
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

export async function updateSavingsGoal(req, res) {
  let connection;
  try {
    const { id } = req.params;
    const { title, target_amount, current_amount, icon, target_date, user_id } = req.body;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({ message: "Invalid goal ID" });
    }

    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ message: "user_id must be a string" });
    }

    // Validate types
    if ((title && typeof title !== 'string') || (icon && typeof icon !== 'string')) {
      return res.status(400).json({ message: "title and icon must be strings" });
    }
    const parsedTargetAmount = target_amount !== undefined ? parseFloat(target_amount) : undefined;
    const parsedCurrentAmount = current_amount !== undefined ? parseFloat(current_amount) : undefined;
    if ((parsedTargetAmount !== undefined && isNaN(parsedTargetAmount)) ||
        (parsedCurrentAmount !== undefined && isNaN(parsedCurrentAmount))) {
      return res.status(400).json({ message: "target_amount and current_amount must be valid numbers" });
    }
    const formattedTargetAmount = parsedTargetAmount !== undefined ? Number(parsedTargetAmount.toFixed(2)) : undefined;
    const formattedCurrentAmount = parsedCurrentAmount !== undefined ? Number(parsedCurrentAmount.toFixed(2)) : undefined;
    let formattedTargetDate = null;
    if (target_date) {
      if (typeof target_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(target_date)) {
        return res.status(400).json({ message: "target_date must be a string in YYYY-MM-DD format" });
      }
      formattedTargetDate = new Date(target_date);
      if (isNaN(formattedTargetDate.getTime())) {
        return res.status(400).json({ message: "Invalid target_date format" });
      }
    }

    connection = await getConnection();
    const binds = {
      id,
      title: title || null,
      target_amount: formattedTargetAmount !== undefined ? formattedTargetAmount : null,
      current_amount: formattedCurrentAmount !== undefined ? formattedCurrentAmount : null,
      icon: icon || null,
      target_date: formattedTargetDate,
      user_id,
    };

    console.log("Bind variables for update:", binds);

    const result = await connection.execute(
      `UPDATE savings_goals
       SET title = NVL(:title, title),
           target_amount = NVL(:target_amount, target_amount),
           current_amount = NVL(:current_amount, current_amount),
           icon = NVL(:icon, icon),
           target_date = :target_date,
           updated_at = SYSDATE
       WHERE id = :id AND user_id = :user_id
       RETURNING id INTO :out_id`,
      {
        ...binds,
        out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      }
    );

    await connection.commit();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "Savings goal not found" });
    }

    const selectResult = await connection.execute(
      `SELECT id, user_id, title, target_amount, current_amount, icon, target_date, created_at, updated_at
       FROM savings_goals WHERE id = :id`,
      { id }
    );

    if (selectResult.rows.length === 0) {
      return res.status(404).json({ message: "Savings goal not found" });
    }

    res.status(200).json(selectResult.rows[0]);
  } catch (error) {
    console.error("Error updating savings goal:", error.message, error.stack, "Request body:", req.body);
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

export async function deleteSavingsGoal(req, res) {
  let connection;
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({ message: "Invalid goal ID" });
    }

    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ message: "user_id must be a string" });
    }

    connection = await getConnection();
    const result = await connection.execute(
      `DELETE FROM savings_goals WHERE id = :id AND user_id = :user_id`,
      { id, user_id }
    );

    await connection.commit();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "Savings goal not found" });
    }

    res.status(200).json({ message: "Savings goal deleted successfully" });
  } catch (error) {
    console.error("Error deleting savings goal:", error.message, error.stack, "Request body:", req.body);
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
}

export async function addMoneyToGoal(req, res) {
  let connection;
  try {
    const { id } = req.params;
    const { amount, user_id } = req.body;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({ message: "Invalid goal ID" });
    }

    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ message: "user_id must be a string" });
    }

    const parsedAmount = Number(parseFloat(amount).toFixed(2));

    connection = await getConnection();
    const goal = await connection.execute(
      `SELECT current_amount FROM savings_goals WHERE id = :id AND user_id = :user_id`,
      { id, user_id }
    );

    if (goal.rows.length === 0) {
      return res.status(404).json({ message: "Savings goal not found" });
    }

    const newAmount = Number((parseFloat(goal.rows[0][0]) + parsedAmount).toFixed(2));

    const result = await connection.execute(
      `UPDATE savings_goals
       SET current_amount = :newAmount, updated_at = SYSDATE
       WHERE id = :id AND user_id = :user_id
       RETURNING id INTO :out_id`,
      {
        id,
        newAmount,
        user_id,
        out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      }
    );

    await connection.commit();

    const selectResult = await connection.execute(
      `SELECT id, user_id, title, target_amount, current_amount, icon, target_date, created_at, updated_at
       FROM savings_goals WHERE id = :id`,
      { id }
    );

    res.status(200).json(selectResult.rows[0]);
  } catch (error) {
    console.error("Error adding money to goal:", error.message, error.stack, "Request body:", req.body);
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

export async function getSavingsGoalById(req, res) {
  let connection;
  try {
    const { id } = req.params;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({ message: "Invalid goal ID" });
    }

    connection = await getConnection();
    const result = await connection.execute(
      `SELECT * FROM savings_goals WHERE id = :id`,
      { id }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Savings goal not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error getting savings goal:", error.message, error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
}

export async function getSavingsSummaryByUserId(req, res) {
  let connection;
  try {
    const { userId } = req.params;
    connection = await getConnection();

    const totalGoals = await connection.execute(
      `SELECT COUNT(*) FROM savings_goals WHERE user_id = :userId`,
      { userId }
    );

    const totalSaved = await connection.execute(
      `SELECT NVL(SUM(current_amount), 0) FROM savings_goals WHERE user_id = :userId`,
      { userId }
    );

    const totalTarget = await connection.execute(
      `SELECT NVL(SUM(target_amount), 0) FROM savings_goals WHERE user_id = :userId`,
      { userId }
    );

    res.status(200).json({
      totalGoals: totalGoals.rows[0][0],
      totalSaved: totalSaved.rows[0][0],
      totalTarget: totalTarget.rows[0][0],
    });
  } catch (error) {
    console.error("Error getting savings summary:", error.message, error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
}