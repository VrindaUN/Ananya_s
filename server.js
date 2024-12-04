const express = require("express");
const bodyParser = require("body-parser");
const cron = require("node-cron");

const app = express();
app.use(bodyParser.json());

const predefinedCategories = ["Food", "Travel", "Shopping", "Bills", "Others"];
const expenses = [];

function validateExpense({ category, amount }) {
  if (!category || !predefinedCategories.includes(category)) {
    return "Invalid category.";
  }
  if (typeof amount !== "number" || amount <= 0) {
    return "Amount must be a positive number.";
  }
  return null;
}

app.post("/expenses", (req, res) => {
  const { category, amount, date } = req.body;
  const validationError = validateExpense({ category, amount });

  if (validationError) {
    return res.status(400).json({ status: "error", error: validationError });
  }

  const expenseDate = new Date(date);
  if (isNaN(expenseDate.getTime())) {
    return res.status(400).json({ status: "error", error: "Invalid date format." });
  }

  const expense = {
    id: expenses.length + 1,
    category,
    amount,
    date: date || new Date().toISOString(),
  };
  expenses.push(expense);

  res.status(201).json({ status: "success", data: expense });
});

app.get("/expenses", (req, res) => {
  const { category, startDate, endDate } = req.query;
  let filteredExpenses = expenses;

  if (category) {
    filteredExpenses = filteredExpenses.filter((e) => e.category === category);
  }
  if (startDate || endDate) {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    filteredExpenses = filteredExpenses.filter((e) => {
      const expenseDate = new Date(e.date);
      return (!start || expenseDate >= start) && (!end || expenseDate <= end);
    });
  }

  res.json({ status: "success", data: filteredExpenses });
});

app.get("/expenses/analysis", (req, res) => {
  const totalByCategory = {};
  let highestCategory = null;
  let highestAmount = 0;
  let monthlyTotals = {};

  expenses.forEach((e) => {
    totalByCategory[e.category] = (totalByCategory[e.category] || 0) + e.amount;

    if (totalByCategory[e.category] > highestAmount) {
      highestAmount = totalByCategory[e.category];
      highestCategory = e.category;
    }

    const month = e.date.substring(0, 7); 
    monthlyTotals[month] = (monthlyTotals[month] || 0) + e.amount;
  });

  res.json({
    status: "success",
    data: {
      totalByCategory,
      highestCategory,
      monthlyTotals,
    },
  });
});

cron.schedule("0 0 * * *", () => {
  console.log("Daily Summary Generated:");
  generateSummary("daily");
});

cron.schedule("0 0 * * 0", () => {
  console.log("Weekly Summary Generated:");
  generateSummary("weekly");
});

cron.schedule("0 0 1 * *", () => {
  console.log("Monthly Summary Generated:");
  generateSummary("monthly");
});

function generateSummary(period) {
  let filteredExpenses = expenses;

  if (period === "daily") {
    const today = new Date().toISOString().split("T")[0];
    filteredExpenses = expenses.filter((e) => e.date.startsWith(today));
  } else if (period === "weekly") {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    filteredExpenses = expenses.filter((e) => new Date(e.date) >= weekAgo);
  } else if (period === "monthly") {
    const currentMonth = new Date().toISOString().substring(0, 7); 
    filteredExpenses = expenses.filter((e) => e.date.startsWith(currentMonth));
  }

  console.log(`Summary for ${period}:`, filteredExpenses);
}

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Personal Expense Tracker API is running on port ${PORT}`);
});
