/**
 * seed-expenses.js  — place in project ROOT (same level as package.json)
 *
 * PURPOSE: Insert 4 months of realistic expense data for the logged-in user.
 * Run: node seed-expenses.js
 *
 * WHY require() instead of import:
 * This is a plain Node.js script, not a Next.js file.
 * It cannot use ES module `import` or the `@/` path alias.
 * The schema fields below exactly match your existing models/Expense.js
 * and models/User.js — same MongoDB collection, same fields, no conflict.
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in .env.local");
  process.exit(1);
}

// ── Mirrors your existing models exactly ──────────────────────────────────────
// Same fields as models/User.js and models/Expense.js
// mongoose.models.X reuses existing compiled model if already registered

const CATEGORIES = [
  "Food & Dining","Transportation","Shopping","Entertainment",
  "Bills & Utilities","Healthcare","Education","Travel","Other",
];

const User = mongoose.models.User || mongoose.model("User",
  new mongoose.Schema(
    { name: String, email: String, password: String },
    { timestamps: true }
  )
);

const Expense = mongoose.models.Expense || mongoose.model("Expense",
  new mongoose.Schema(
    {
      userId:      { type: String, required: true, index: true },
      title:       { type: String, required: true, trim: true, maxlength: 100 },
      amount:      { type: Number, required: true, min: 0.01 },
      category:    { type: String, required: true, enum: CATEGORIES },
      date:        { type: Date,   required: true },
      description: { type: String, trim: true, maxlength: 300, default: "" },
    },
    { timestamps: true }
  )
);

// ── 4 Months of Realistic Data ────────────────────────────────────────────────
// Format: [title, amount, category, day_of_month, description]

const DECEMBER_2025 = [
  // Food & Dining (weekday + weekend mix)
  ["Zomato dinner order",       450,  "Food & Dining",    2,  "Biryani and raita"],
  ["Big Basket groceries",      2200, "Food & Dining",    5,  "Monthly groceries"],
  ["Starbucks coffee",          420,  "Food & Dining",    7,  "Caramel macchiato"],
  ["Swiggy lunch",              320,  "Food & Dining",    9,  "Office lunch"],
  ["Restaurant dinner",         1800, "Food & Dining",    14, "Family dinner weekend"],
  ["Dominos pizza",             580,  "Food & Dining",    15, "Weekend pizza"],
  ["Blinkit groceries",         890,  "Food & Dining",    18, "Mid-month restock"],
  ["Canteen lunch",             120,  "Food & Dining",    20, "Office canteen"],
  ["Coffee shop breakfast",     280,  "Food & Dining",    22, "Morning coffee"],
  ["Fruit vegetables market",   350,  "Food & Dining",    25, "Weekly vegetables"],
  ["Swiggy weekend dinner",     650,  "Food & Dining",    27, "Saturday night"],
  ["Bakery cake",               450,  "Food & Dining",    30, "Christmas cake"],
  // Transportation
  ["Uber office cab",           180,  "Transportation",   3,  "Morning commute"],
  ["Ola cab airport",           650,  "Transportation",   10, "Airport drop"],
  ["Metro card recharge",       500,  "Transportation",   12, "Monthly metro pass"],
  ["Petrol refill",             1500, "Transportation",   16, "Tank full"],
  ["Rapido bike ride",          80,   "Transportation",   19, "Quick errand"],
  ["Uber ride back home",       220,  "Transportation",   24, "Late night cab"],
  ["Parking charges",           50,   "Transportation",   28, "Mall parking"],
  // Shopping
  ["Amazon order",              1299, "Shopping",         4,  "Phone case charger"],
  ["Myntra clothes",            2499, "Shopping",         11, "Winter jacket"],
  ["Flipkart order",            899,  "Shopping",         17, "Books stationery"],
  ["Christmas gifts",           3500, "Shopping",         23, "Family gifts"],
  // Entertainment
  ["Netflix subscription",      649,  "Entertainment",    1,  "Monthly plan"],
  ["PVR movie tickets",         600,  "Entertainment",    13, "Avatar 2 tickets"],
  ["Spotify premium",           119,  "Entertainment",    1,  "Music subscription"],
  // Bills & Utilities
  ["House rent",                18000,"Bills & Utilities",1,  "Monthly rent"],
  ["Electricity bill",          2100, "Bills & Utilities",6,  "December bill"],
  ["Internet broadband",        799,  "Bills & Utilities",5,  "Monthly wifi"],
  ["Jio postpaid bill",         899,  "Bills & Utilities",8,  "Monthly mobile bill"],
  // Healthcare
  ["Gym membership",            1200, "Healthcare",       1,  "Monthly gym"],
  ["Apollo pharmacy",           380,  "Healthcare",       21, "Cold medicine"],
  // Education
  ["Udemy course",              499,  "Education",        15, "React advanced course"],
  // Travel
  ["IndiGo flight ticket",      4500, "Travel",           20, "Goa trip booking"],
  // Other
  ["Haircut salon",             200,  "Other",            26, "Monthly haircut"],
];

const JANUARY_2026 = [
  // Food & Dining
  ["Zomato biryani order",      380,  "Food & Dining",    1,  "New year dinner"],
  ["Big Basket monthly",        2400, "Food & Dining",    3,  "Monthly groceries"],
  ["McDonald's lunch",          350,  "Food & Dining",    6,  "Quick lunch"],
  ["Swiggy dinner",             420,  "Food & Dining",    8,  "Lazy Sunday dinner"],
  ["Coffee shop meeting",       560,  "Food & Dining",    10, "Client coffee meeting"],
  ["Restaurant birthday",       2200, "Food & Dining",    15, "Friend birthday dinner"],
  ["Blinkit groceries",         760,  "Food & Dining",    17, "Restock vegetables"],
  ["KFC chicken",               440,  "Food & Dining",    20, "Weekend treat"],
  ["Canteen lunch daily",       240,  "Food & Dining",    22, "Office lunch"],
  ["Fruit market",              280,  "Food & Dining",    24, "Weekly fruits"],
  ["Swiggy Saturday",           680,  "Food & Dining",    25, "Saturday night dinner"],
  ["Zepto milk eggs",           320,  "Food & Dining",    29, "Daily essentials"],
  // Transportation
  ["Uber morning cab",          160,  "Transportation",   2,  "Office commute"],
  ["Metro monthly pass",        500,  "Transportation",   1,  "January metro pass"],
  ["Petrol refill car",         1800, "Transportation",   14, "Full tank petrol"],
  ["Ola cab rain day",          240,  "Transportation",   18, "Rainy day cab"],
  ["Auto rickshaw",             60,   "Transportation",   23, "Short distance"],
  ["Rapido to station",         90,   "Transportation",   27, "Train station"],
  // Shopping
  ["Amazon electronics",        1599, "Shopping",         5,  "USB hub keyboard"],
  ["Myntra winter sale",        3200, "Shopping",         13, "Sweaters and hoodie"],
  ["Nykaa skincare",            899,  "Shopping",         19, "Face wash moisturizer"],
  // Entertainment
  ["Netflix subscription",      649,  "Entertainment",    1,  "Monthly plan"],
  ["Amazon Prime",              299,  "Entertainment",    1,  "Monthly prime"],
  ["BookMyShow movie",          480,  "Entertainment",    21, "Pathaan 2 tickets"],
  ["Spotify premium",           119,  "Entertainment",    1,  "Monthly music"],
  // Bills & Utilities
  ["House rent January",        18000,"Bills & Utilities",1,  "Monthly rent"],
  ["Electricity bill",          1850, "Bills & Utilities",7,  "January electricity"],
  ["Jio mobile bill",           899,  "Bills & Utilities",8,  "Monthly plan"],
  ["Internet wifi",             799,  "Bills & Utilities",5,  "Broadband bill"],
  ["Gas cylinder",              950,  "Bills & Utilities",12, "LPG cylinder"],
  // Healthcare
  ["Gym membership",            1200, "Healthcare",       1,  "January gym"],
  ["Doctor consultation",       500,  "Healthcare",       16, "Fever checkup"],
  ["Medicine pharmacy",         340,  "Healthcare",       17, "Prescribed medicines"],
  // Education
  ["Coursera subscription",     1999, "Education",        10, "3 month plan"],
  ["Books textbooks",           650,  "Education",        15, "Programming books"],
  // Travel
  ["OYO hotel Goa",             3200, "Travel",           21, "2 nights Goa stay"],
  ["Goa water sports",          1500, "Travel",           22, "Water sports activities"],
  // Other
  ["Haircut barber",            150,  "Other",            28, "Monthly trim"],
  ["Laundry service",           300,  "Other",            16, "Clothes ironing"],
];

const FEBRUARY_2026 = [
  // Food & Dining (Valentine's spike on 14th for anomaly + insight demo)
  ["Zomato weekend order",      520,  "Food & Dining",    1,  "Saturday dinner"],
  ["Big Basket groceries",      2100, "Food & Dining",    4,  "Monthly groceries"],
  ["Subway sandwich",           380,  "Food & Dining",    6,  "Lunch meeting"],
  ["Swiggy weekday dinner",     350,  "Food & Dining",    10, "Tired weekday"],
  ["Coffee Starbucks",          460,  "Food & Dining",    12, "Valentine day coffee"],
  ["Valentine dinner",          3200, "Food & Dining",    14, "Special dinner date"],
  ["Blinkit essentials",        680,  "Food & Dining",    16, "Milk bread eggs"],
  ["Restaurant Sunday",         1400, "Food & Dining",    17, "Family lunch Sunday"],
  ["McDonald's quick lunch",    320,  "Food & Dining",    19, "Fast lunch"],
  ["Fruit vegetables",          290,  "Food & Dining",    21, "Weekly fresh"],
  ["Dominos Saturday",          540,  "Food & Dining",    22, "Pizza night"],
  ["Canteen office",            180,  "Food & Dining",    25, "Office food"],
  // Transportation
  ["Uber daily commute",        340,  "Transportation",   3,  "2 days uber"],
  ["Metro pass February",       500,  "Transportation",   1,  "Monthly metro"],
  ["Petrol fuel",               1600, "Transportation",   13, "Half tank petrol"],
  ["Rapido bike",               120,  "Transportation",   20, "Quick rides"],
  ["Auto station",              70,   "Transportation",   26, "Railway station"],
  // Shopping
  ["Amazon order Feb",          2199, "Shopping",         8,  "Desk lamp organizer"],
  ["Valentine gift",            1800, "Shopping",         13, "Gift for partner"],
  ["Myntra clothes",            1499, "Shopping",         20, "Casual tshirts"],
  // Entertainment
  ["Netflix subscription",      649,  "Entertainment",    1,  "Monthly plan"],
  ["Spotify premium",           119,  "Entertainment",    1,  "Monthly music"],
  ["Cinema PVR",                720,  "Entertainment",    14, "Valentine movie"],
  // Bills & Utilities
  ["House rent February",       18000,"Bills & Utilities",1,  "Monthly rent"],
  ["Electricity February",      1650, "Bills & Utilities",6,  "Feb electricity"],
  ["Jio bill",                  899,  "Bills & Utilities",8,  "Mobile plan"],
  ["Internet broadband",        799,  "Bills & Utilities",5,  "Wifi bill"],
  // Healthcare — ANOMALY for demo: ₹8500 vs normal ₹1200 average
  ["Gym membership",            1200, "Healthcare",       1,  "Monthly gym"],
  ["Apollo hospital emergency", 8500, "Healthcare",       11, "Emergency checkup + tests"],
  ["Medicine after hospital",   620,  "Healthcare",       12, "Prescribed medicines"],
  // Education
  ["Online course payment",     799,  "Education",        18, "JavaScript advanced"],
  // Other
  ["Haircut salon",             200,  "Other",            27, "Monthly grooming"],
  ["Charity donation",          500,  "Other",            28, "NGO donation"],
];

const MARCH_2026 = [
  // Food & Dining
  ["Zomato holi order",         480,  "Food & Dining",    1,  "Holi celebration"],
  ["Big Basket March",          2300, "Food & Dining",    3,  "Monthly groceries"],
  ["Office lunch canteen",      160,  "Food & Dining",    5,  "Weekday lunch"],
  ["Swiggy dinner",             390,  "Food & Dining",    7,  "Friday dinner"],
  ["Coffee shop work",          340,  "Food & Dining",    10, "Work from cafe"],
  ["Restaurant weekend",        1650, "Food & Dining",    14, "Saturday lunch"],
  ["Blinkit quick order",       440,  "Food & Dining",    16, "Snacks restock"],
  ["KFC Sunday treat",          520,  "Food & Dining",    18, "Weekend indulgence"],
  // Transportation
  ["Uber rides March",          420,  "Transportation",   4,  "3 rides this week"],
  ["Metro March pass",          500,  "Transportation",   1,  "Monthly metro"],
  ["Petrol refill",             1750, "Transportation",   12, "Full tank"],
  ["Rapido quick rides",        140,  "Transportation",   19, "Short errands"],
  // Shopping
  ["Amazon March order",        1099, "Shopping",         6,  "Storage organizer"],
  ["Myntra spring sale",        2799, "Shopping",         15, "New season clothes"],
  // Entertainment
  ["Netflix subscription",      649,  "Entertainment",    1,  "Monthly plan"],
  ["Spotify premium",           119,  "Entertainment",    1,  "Monthly music"],
  ["BookMyShow comedy show",    800,  "Entertainment",    16, "Stand up comedy"],
  // Bills & Utilities
  ["House rent March",          18000,"Bills & Utilities",1,  "Monthly rent"],
  ["Electricity March",         1900, "Bills & Utilities",5,  "March bill"],
  ["Jio mobile March",          899,  "Bills & Utilities",8,  "Monthly plan"],
  ["Internet March",            799,  "Bills & Utilities",5,  "Wifi bill"],
  // Healthcare
  ["Gym membership March",      1200, "Healthcare",       1,  "Monthly gym"],
  ["Eye checkup doctor",        400,  "Healthcare",       11, "Annual eye checkup"],
  ["Protein supplement",        1299, "Healthcare",       15, "Whey protein"],
  // Education
  ["AWS certification exam",    3500, "Education",        10, "AWS exam voucher"],
  // Travel
  ["Flight Hyderabad work",     3800, "Travel",           18, "Work trip ticket"],
  ["Hotel 2 nights work",       2400, "Travel",           19, "Work trip hotel"],
  // Other
  ["Haircut barber",            150,  "Other",            25, "Monthly haircut"],
  ["Laundry monthly",           280,  "Other",            20, "Monthly laundry"],
];

// ── Run Seed ──────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB\n");

  const user = await User.findOne({}).lean();
  if (!user) {
    console.error("❌ No user found. Register at http://localhost:3000/register first.");
    process.exit(1);
  }
  console.log(`✅ Seeding for: ${user.name} (${user.email})\n`);

  const deleted = await Expense.deleteMany({ userId: user._id.toString() });
  console.log(`🗑️  Cleared ${deleted.deletedCount} old expenses`);

  const docs = [];
  const addMonth = (data, year, month) =>
    data.forEach(([title, amount, category, day, description]) =>
      docs.push({
        userId: user._id.toString(),
        title, amount, category,
        date: new Date(year, month - 1, day, 10, 30, 0),
        description: description || "",
      })
    );

  addMonth(DECEMBER_2025, 2025, 12);
  addMonth(JANUARY_2026,  2026, 1);
  addMonth(FEBRUARY_2026, 2026, 2);
  addMonth(MARCH_2026,    2026, 3);

  await Expense.insertMany(docs);

  const totals = {};
  docs.forEach((d) => {
    const m = d.date.toISOString().slice(0, 7);
    totals[m] = (totals[m] || 0) + d.amount;
  });

  const labels = {
    "2025-12":"December 2025","2026-01":"January  2026",
    "2026-02":"February 2026","2026-03":"March    2026",
  };

  console.log(`\n✅ Inserted ${docs.length} expenses:\n`);
  Object.entries(totals).sort().forEach(([m, t]) =>
    console.log(`   ${labels[m]}: ₹${t.toLocaleString("en-IN")}`)
  );

  console.log("\n🎯 ML Features Ready:");
  console.log("   ✅ Category Prediction  — Type 'Uber' → Transportation");
  console.log("   ✅ Anomaly Detection    — Feb ₹8,500 hospital vs avg ₹1,200");
  console.log("   ✅ Spending Prediction  — 4 months Linear Regression data");
  console.log("   ✅ Smart Insights       — Weekend spikes, category trends");
  console.log("   ✅ Budget Recommend     — Consistent monthly pattern data");
  console.log("\n✅ Open http://localhost:3000/analytics\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});