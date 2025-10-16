import { getConnection } from "../config/db.js";
import oracledb from "oracledb";

export async function uploadSyncData(req, res) {
  let connection;
  try {
    const { userId, lastSyncTime, transactions, budgets, goals } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    connection = await getConnection();

    let totalSynced = 0;
    let conflictsResolved = 0;

    // Sync Transactions
    for (const trans of transactions || []) {
      try {
        await connection.execute(
          `INSERT INTO transactions (user_id, title, amount, category, transaction_date, created_at, updated_at)
           VALUES (:user_id, :title, :amount, :category, TO_DATE(:transaction_date, 'YYYY-MM-DD'),
                   TO_DATE(:created_at, 'YYYY-MM-DD HH24:MI:SS'), TO_DATE(:updated_at, 'YYYY-MM-DD HH24:MI:SS'))`,
          {
            user_id: userId,
            title: trans.title,
            amount: trans.amount,
            category: trans.category,
            transaction_date: trans.transaction_date,
            created_at: trans.created_at,
            updated_at: trans.updated_at,
          }
        );
        totalSynced++;
      } catch (error) {
        console.error('Error syncing transaction:', error);
        conflictsResolved++;
      }
    }

    // Sync Budgets
    for (const budget of budgets || []) {
      try {
        await connection.execute(
          `INSERT INTO budgets (user_id, category, amount, period, start_date, end_date, created_at, updated_at)
           VALUES (:user_id, :category, :amount, :period, TO_DATE(:start_date, 'YYYY-MM-DD'),
                   TO_DATE(:end_date, 'YYYY-MM-DD'), TO_DATE(:created_at, 'YYYY-MM-DD HH24:MI:SS'),
                   TO_DATE(:updated_at, 'YYYY-MM-DD HH24:MI:SS'))`,
          {
            user_id: userId,
            category: budget.category,
            amount: budget.amount,
            period: budget.period,
            start_date: budget.start_date,
            end_date: budget.end_date,
            created_at: budget.created_at,
            updated_at: budget.updated_at,
          }
        );
        totalSynced++;
      } catch (error) {
        console.error('Error syncing budget:', error);
        conflictsResolved++;
      }
    }

    // Sync Goals
    for (const goal of goals || []) {
      try {
        await connection.execute(
          `INSERT INTO savings_goals (user_id, title, target_amount, current_amount, target_date, icon, created_at, updated_at)
           VALUES (:user_id, :title, :target_amount, :current_amount,
                   ${goal.target_date ? "TO_DATE(:target_date, 'YYYY-MM-DD')" : "NULL"},
                   :icon, TO_DATE(:created_at, 'YYYY-MM-DD HH24:MI:SS'), TO_DATE(:updated_at, 'YYYY-MM-DD HH24:MI:SS'))`,
          {
            user_id: userId,
            title: goal.title,
            target_amount: goal.target_amount,
            current_amount: goal.current_amount,
            target_date: goal.target_date || null,
            icon: goal.icon,
            created_at: goal.created_at,
            updated_at: goal.updated_at,
          }
        );
        totalSynced++;
      } catch (error) {
        console.error('Error syncing goal:', error);
        conflictsResolved++;
      }
    }

    await connection.commit();

    res.status(200).json({
      success: true,
      message: 'Sync completed successfully',
      recordsSynced: totalSynced,
      conflictsResolved,
    });
  } catch (error) {
    console.error('Sync error:', error);
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  } finally {
    if (connection) await connection.close();
  }
}