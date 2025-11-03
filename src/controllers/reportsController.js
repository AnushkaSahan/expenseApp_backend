import { getConnection } from "../config/db.js";
import oracledb from "oracledb";

export async function getMonthlyExpenditureAnalysis(req, res) {
  let connection;
  try {
    const { userId } = req.params;
    const { year, month } = req.query;

    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    connection = await getConnection();

    const result = await connection.execute(
      `BEGIN
        get_monthly_expenditure_analysis(:user_id, :year, :month, :cursor);
       END;`,
      {
        user_id: userId,
        year: parseInt(currentYear),
        month: parseInt(currentMonth),
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
      }
    );

    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows();
    await resultSet.close();

    const formattedData = rows.map((row) => ({
      month: row[0],
      category: row[1],
      totalExpense: parseFloat(row[2]),
      totalIncome: parseFloat(row[3]),
      expenseCount: row[4],
      avgExpense: parseFloat(row[5]),
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    console.error("Error getting monthly expenditure analysis:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  } finally {
    if (connection) await connection.close();
  }
}

export async function getBudgetAdherence(req, res) {
  let connection;
  try {
    const { userId } = req.params;

    connection = await getConnection();

    const result = await connection.execute(
      `BEGIN
        get_budget_adherence(:user_id, :cursor);
       END;`,
      {
        user_id: userId,
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
      }
    );

    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows();
    await resultSet.close();

    const formattedData = rows.map((row) => ({
      category: row[0],
      budgetAmount: parseFloat(row[1]),
      period: row[2],
      spentAmount: parseFloat(row[3]),
      remainingAmount: parseFloat(row[4]),
      adherencePercentage: parseFloat(row[5]),
      status: row[6],
      transactionCount: row[7],
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    console.error("Error getting budget adherence:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  } finally {
    if (connection) await connection.close();
  }
}

export async function getSavingsGoalProgress(req, res) {
  let connection;
  try {
    const { userId } = req.params;

    connection = await getConnection();

    const result = await connection.execute(
      `BEGIN
        get_savings_goal_progress(:user_id, :cursor);
       END;`,
      {
        user_id: userId,
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
      }
    );

    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows();
    await resultSet.close();

    const formattedData = rows.map((row) => ({
      id: row[0],
      title: row[1],
      targetAmount: parseFloat(row[2]),
      currentAmount: parseFloat(row[3]),
      remainingAmount: parseFloat(row[4]),
      progressPercentage: parseFloat(row[5]),
      targetDate: row[6],
      daysRemaining: row[7],
      status: row[8],
      dailySavingsNeeded: row[9] ? parseFloat(row[9]) : null,
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    console.error("Error getting savings goal progress:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  } finally {
    if (connection) await connection.close();
  }
}

export async function getCategoryExpenseDistribution(req, res) {
  let connection;
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    connection = await getConnection();

    const result = await connection.execute(
      `BEGIN
        get_category_expense_distribution(:user_id, :start_date, :end_date, :cursor);
       END;`,
      {
        user_id: userId,
        start_date: start,
        end_date: end,
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
      }
    );

    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows();
    await resultSet.close();

    const formattedData = rows.map((row) => ({
      category: row[0],
      totalAmount: parseFloat(row[1]),
      transactionCount: row[2],
      avgAmount: parseFloat(row[3]),
      minAmount: parseFloat(row[4]),
      maxAmount: parseFloat(row[5]),
      percentage: parseFloat(row[6]),
      rank: row[7],
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    console.error("Error getting category expense distribution:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  } finally {
    if (connection) await connection.close();
  }
}

export async function getForecastedSavingsTrends(req, res) {
  let connection;
  try {
    const { userId } = req.params;
    const { monthsBack = 6, monthsForecast = 3 } = req.query;

    connection = await getConnection();

    const result = await connection.execute(
      `BEGIN
        get_forecasted_savings_trends(:user_id, :months_back, :months_forecast, :cursor);
       END;`,
      {
        user_id: userId,
        months_back: parseInt(monthsBack),
        months_forecast: parseInt(monthsForecast),
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
      }
    );

    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows();
    await resultSet.close();

    const formattedData = rows.map((row) => ({
      forecastMonth: row[0],
      forecastDate: row[1],
      projectedIncome: parseFloat(row[2]),
      projectedExpense: parseFloat(row[3]),
      projectedSavings: parseFloat(row[4]),
      projectedBalance: parseFloat(row[5]),
      confidenceLevel: row[6],
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    console.error("Error getting forecasted savings trends:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  } finally {
    if (connection) await connection.close();
  }
}

export async function getAllReportsSummary(req, res) {
  let connection;
  try {
    const { userId } = req.params;

    connection = await getConnection();

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const monthlyResult = await connection.execute(
      `SELECT
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_expense,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_income,
        COUNT(CASE WHEN amount < 0 THEN 1 END) as expense_transactions
       FROM transactions
       WHERE user_id = :user_id
         AND EXTRACT(YEAR FROM created_at) = :year
         AND EXTRACT(MONTH FROM created_at) = :month`,
      { user_id: userId, year: currentYear, month: currentMonth }
    );

    const budgetResult = await connection.execute(
      `SELECT
        COUNT(*) as total_budgets,
        COUNT(CASE WHEN (SELECT NVL(SUM(ABS(amount)), 0)
                         FROM transactions t
                         WHERE t.category = b.category
                           AND t.user_id = b.user_id
                           AND t.amount < 0) > b.amount
              THEN 1 END) as over_budget_count
       FROM budgets b
       WHERE user_id = :user_id`,
      { user_id: userId }
    );

    const savingsResult = await connection.execute(
      `SELECT
        COUNT(*) as total_goals,
        COUNT(CASE WHEN current_amount >= target_amount THEN 1 END) as completed_goals,
        SUM(current_amount) as total_saved,
        SUM(target_amount) as total_target
       FROM savings_goals
       WHERE user_id = :user_id`,
      { user_id: userId }
    );

    const summary = {
      monthly: {
        totalExpense: parseFloat(monthlyResult.rows[0][0]) || 0,
        totalIncome: parseFloat(monthlyResult.rows[0][1]) || 0,
        expenseTransactions: monthlyResult.rows[0][2] || 0,
      },
      budgets: {
        totalBudgets: budgetResult.rows[0][0] || 0,
        overBudgetCount: budgetResult.rows[0][1] || 0,
      },
      savings: {
        totalGoals: savingsResult.rows[0][0] || 0,
        completedGoals: savingsResult.rows[0][1] || 0,
        totalSaved: parseFloat(savingsResult.rows[0][2]) || 0,
        totalTarget: parseFloat(savingsResult.rows[0][3]) || 0,
      },
    };

    res.status(200).json(summary);
  } catch (error) {
    console.error("Error getting reports summary:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  } finally {
    if (connection) await connection.close();
  }
}