/**
 * seed-expenses.js  — place in project ROOT (same level as package.json)
 *
 * PURPOSE: Insert 7 months of realistic expense data for the logged-in user.
 * Run: node seed-expenses.js
 *
 * Months covered:
 *   December 2025, January 2026, February 2026, March 2026
 *   April 2026, May 2026, June 2026 (partial — current month)
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in .env.local");
  process.exit(1);
}

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

// Format: [title, amount, category, day_of_month, description]

const DECEMBER_2025 = [
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
  ["Uber office cab",           180,  "Transportation",   3,  "Morning commute"],
  ["Ola cab airport",           650,  "Transportation",   10, "Airport drop"],
  ["Metro card recharge",       500,  "Transportation",   12, "Monthly metro pass"],
  ["Petrol refill",             1500, "Transportation",   16, "Tank full"],
  ["Rapido bike ride",          80,   "Transportation",   19, "Quick errand"],
  ["Uber ride back home",       220,  "Transportation",   24, "Late night cab"],
  ["Parking charges",           50,   "Transportation",   28, "Mall parking"],
  ["Amazon order",              1299, "Shopping",         4,  "Phone case charger"],
  ["Myntra clothes",            2499, "Shopping",         11, "Winter jacket"],
  ["Flipkart order",            899,  "Shopping",         17, "Books stationery"],
  ["Christmas gifts",           3500, "Shopping",         23, "Family gifts"],
  ["Netflix subscription",      649,  "Entertainment",    1,  "Monthly plan"],
  ["PVR movie tickets",         600,  "Entertainment",    13, "Avatar 2 tickets"],
  ["Spotify premium",           119,  "Entertainment",    1,  "Music subscription"],
  ["House rent",                18000,"Bills & Utilities",1,  "Monthly rent"],
  ["Electricity bill",          2100, "Bills & Utilities",6,  "December bill"],
  ["Internet broadband",        799,  "Bills & Utilities",5,  "Monthly wifi"],
  ["Jio postpaid bill",         899,  "Bills & Utilities",8,  "Monthly mobile bill"],
  ["Gym membership",            1200, "Healthcare",       1,  "Monthly gym"],
  ["Apollo pharmacy",           380,  "Healthcare",       21, "Cold medicine"],
  ["Udemy course",              499,  "Education",        15, "React advanced course"],
  ["IndiGo flight ticket",      4500, "Travel",           20, "Goa trip booking"],
  ["Haircut salon",             200,  "Other",            26, "Monthly haircut"],
];

const JANUARY_2026 = [
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
  ["Uber morning cab",          160,  "Transportation",   2,  "Office commute"],
  ["Metro monthly pass",        500,  "Transportation",   1,  "January metro pass"],
  ["Petrol refill car",         1800, "Transportation",   14, "Full tank petrol"],
  ["Ola cab rain day",          240,  "Transportation",   18, "Rainy day cab"],
  ["Auto rickshaw",             60,   "Transportation",   23, "Short distance"],
  ["Rapido to station",         90,   "Transportation",   27, "Train station"],
  ["Amazon electronics",        1599, "Shopping",         5,  "USB hub keyboard"],
  ["Myntra winter sale",        3200, "Shopping",         13, "Sweaters and hoodie"],
  ["Nykaa skincare",            899,  "Shopping",         19, "Face wash moisturizer"],
  ["Netflix subscription",      649,  "Entertainment",    1,  "Monthly plan"],
  ["Amazon Prime",              299,  "Entertainment",    1,  "Monthly prime"],
  ["BookMyShow movie",          480,  "Entertainment",    21, "Pathaan 2 tickets"],
  ["Spotify premium",           119,  "Entertainment",    1,  "Monthly music"],
  ["House rent January",        18000,"Bills & Utilities",1,  "Monthly rent"],
  ["Electricity bill",          1850, "Bills & Utilities",7,  "January electricity"],
  ["Jio mobile bill",           899,  "Bills & Utilities",8,  "Monthly plan"],
  ["Internet wifi",             799,  "Bills & Utilities",5,  "Broadband bill"],
  ["Gas cylinder",              950,  "Bills & Utilities",12, "LPG cylinder"],
  ["Gym membership",            1200, "Healthcare",       1,  "January gym"],
  ["Doctor consultation",       500,  "Healthcare",       16, "Fever checkup"],
  ["Medicine pharmacy",         340,  "Healthcare",       17, "Prescribed medicines"],
  ["Coursera subscription",     1999, "Education",        10, "3 month plan"],
  ["Books textbooks",           650,  "Education",        15, "Programming books"],
  ["OYO hotel Goa",             3200, "Travel",           21, "2 nights Goa stay"],
  ["Goa water sports",          1500, "Travel",           22, "Water sports activities"],
  ["Haircut barber",            150,  "Other",            28, "Monthly trim"],
  ["Laundry service",           300,  "Other",            16, "Clothes ironing"],
];

const FEBRUARY_2026 = [
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
  ["Uber daily commute",        340,  "Transportation",   3,  "2 days uber"],
  ["Metro pass February",       500,  "Transportation",   1,  "Monthly metro"],
  ["Petrol fuel",               1600, "Transportation",   13, "Half tank petrol"],
  ["Rapido bike",               120,  "Transportation",   20, "Quick rides"],
  ["Auto station",              70,   "Transportation",   26, "Railway station"],
  ["Amazon order Feb",          2199, "Shopping",         8,  "Desk lamp organizer"],
  ["Valentine gift",            1800, "Shopping",         13, "Gift for partner"],
  ["Myntra clothes",            1499, "Shopping",         20, "Casual tshirts"],
  ["Netflix subscription",      649,  "Entertainment",    1,  "Monthly plan"],
  ["Spotify premium",           119,  "Entertainment",    1,  "Monthly music"],
  ["Cinema PVR",                720,  "Entertainment",    14, "Valentine movie"],
  ["House rent February",       18000,"Bills & Utilities",1,  "Monthly rent"],
  ["Electricity February",      1650, "Bills & Utilities",6,  "Feb electricity"],
  ["Jio bill",                  899,  "Bills & Utilities",8,  "Mobile plan"],
  ["Internet broadband",        799,  "Bills & Utilities",5,  "Wifi bill"],
  ["Gym membership",            1200, "Healthcare",       1,  "Monthly gym"],
  ["Apollo hospital emergency", 8500, "Healthcare",       11, "Emergency checkup + tests"],
  ["Medicine after hospital",   620,  "Healthcare",       12, "Prescribed medicines"],
  ["Online course payment",     799,  "Education",        18, "JavaScript advanced"],
  ["Haircut salon",             200,  "Other",            27, "Monthly grooming"],
  ["Charity donation",          500,  "Other",            28, "NGO donation"],
];

const MARCH_2026 = [
  ["Zomato holi order",         480,  "Food & Dining",    1,  "Holi celebration"],
  ["Big Basket March",          2300, "Food & Dining",    3,  "Monthly groceries"],
  ["Office lunch canteen",      160,  "Food & Dining",    5,  "Weekday lunch"],
  ["Swiggy dinner",             390,  "Food & Dining",    7,  "Friday dinner"],
  ["Coffee shop work",          340,  "Food & Dining",    10, "Work from cafe"],
  ["Restaurant weekend",        1650, "Food & Dining",    14, "Saturday lunch"],
  ["Blinkit quick order",       440,  "Food & Dining",    16, "Snacks restock"],
  ["KFC Sunday treat",          520,  "Food & Dining",    18, "Weekend indulgence"],
  ["Uber rides March",          420,  "Transportation",   4,  "3 rides this week"],
  ["Metro March pass",          500,  "Transportation",   1,  "Monthly metro"],
  ["Petrol refill",             1750, "Transportation",   12, "Full tank"],
  ["Rapido quick rides",        140,  "Transportation",   19, "Short errands"],
  ["Amazon March order",        1099, "Shopping",         6,  "Storage organizer"],
  ["Myntra spring sale",        2799, "Shopping",         15, "New season clothes"],
  ["Netflix subscription",      649,  "Entertainment",    1,  "Monthly plan"],
  ["Spotify premium",           119,  "Entertainment",    1,  "Monthly music"],
  ["BookMyShow comedy show",    800,  "Entertainment",    16, "Stand up comedy"],
  ["House rent March",          18000,"Bills & Utilities",1,  "Monthly rent"],
  ["Electricity March",         1900, "Bills & Utilities",5,  "March bill"],
  ["Jio mobile March",          899,  "Bills & Utilities",8,  "Monthly plan"],
  ["Internet March",            799,  "Bills & Utilities",5,  "Wifi bill"],
  ["Gym membership March",      1200, "Healthcare",       1,  "Monthly gym"],
  ["Eye checkup doctor",        400,  "Healthcare",       11, "Annual eye checkup"],
  ["Protein supplement",        1299, "Healthcare",       15, "Whey protein"],
  ["AWS certification exam",    3500, "Education",        10, "AWS exam voucher"],
  ["Flight Hyderabad work",     3800, "Travel",           18, "Work trip ticket"],
  ["Hotel 2 nights work",       2400, "Travel",           19, "Work trip hotel"],
  ["Haircut barber",            150,  "Other",            25, "Monthly haircut"],
  ["Laundry monthly",           280,  "Other",            20, "Monthly laundry"],
];

const APRIL_2026 = [
  ["Zomato weekend biryani",    490,  "Food & Dining",    5,  "Saturday dinner"],
  ["Big Basket April",          2250, "Food & Dining",    2,  "Monthly groceries"],
  ["Swiggy lunch office",       360,  "Food & Dining",    8,  "Weekday lunch"],
  ["Coffee Third Wave",         380,  "Food & Dining",    10, "Work from cafe"],
  ["Restaurant anniversary",    2800, "Food & Dining",    13, "Anniversary dinner"],
  ["Blinkit essentials",        590,  "Food & Dining",    15, "Milk curd butter"],
  ["McDonald's kids meal",      480,  "Food & Dining",    19, "Weekend outing"],
  ["Swiggy rainy evening",      420,  "Food & Dining",    22, "Comfort food"],
  ["Fruit market weekly",       310,  "Food & Dining",    24, "Fresh fruits"],
  ["Dominos Sunday",            620,  "Food & Dining",    27, "Pizza night"],
  ["Zepto quick order",         240,  "Food & Dining",    29, "Bread eggs"],
  ["Metro April pass",          500,  "Transportation",   1,  "Monthly metro"],
  ["Uber office commute",       280,  "Transportation",   4,  "Weekday rides"],
  ["Petrol full tank",          1800, "Transportation",   11, "Monthly petrol"],
  ["Rapido errands",            110,  "Transportation",   17, "Quick errands"],
  ["Ola cab late night",        340,  "Transportation",   25, "Late office night"],
  ["Amazon April sale",         3499, "Shopping",         10, "Summer clothes shoes"],
  ["Flipkart phone cover",      399,  "Shopping",         18, "New phone cover"],
  ["Nykaa grooming",            699,  "Shopping",         23, "Grooming products"],
  ["Netflix subscription",      649,  "Entertainment",    1,  "Monthly plan"],
  ["Spotify premium",           119,  "Entertainment",    1,  "Monthly music"],
  ["IPL match tickets",         1500, "Entertainment",    14, "IPL CSK vs MI"],
  ["BookMyShow film",           560,  "Entertainment",    20, "New release movie"],
  ["House rent April",          18000,"Bills & Utilities",1,  "Monthly rent"],
  ["Electricity April",         2200, "Bills & Utilities",6,  "Summer AC bill"],
  ["Jio mobile April",          899,  "Bills & Utilities",8,  "Monthly plan"],
  ["Internet April",            799,  "Bills & Utilities",5,  "Broadband wifi"],
  ["Gas cylinder April",        950,  "Bills & Utilities",14, "LPG refill"],
  ["Gym membership April",      1200, "Healthcare",       1,  "Monthly gym"],
  ["Dermatologist visit",       700,  "Healthcare",       16, "Skin checkup summer"],
  ["Sunscreen medicine",        450,  "Healthcare",       17, "Summer skincare"],
  ["System design course",      1499, "Education",        12, "Backend system design"],
  ["Train ticket Pune",         850,  "Travel",           26, "Weekend Pune trip"],
  ["Pune hotel night",          1800, "Travel",           27, "1 night stay"],
  ["Haircut April",             150,  "Other",            28, "Monthly trim"],
  ["Car wash service",          299,  "Other",            20, "Monthly car wash"],
];

const MAY_2026 = [
  ["Zomato May order",          510,  "Food & Dining",    3,  "Weekend dinner"],
  ["Big Basket May",            2350, "Food & Dining",    1,  "Monthly groceries"],
  ["Swiggy office lunch",       380,  "Food & Dining",    6,  "Busy weekday"],
  ["Coffee work session",       420,  "Food & Dining",    9,  "Long work session cafe"],
  ["Restaurant mothers day",    3500, "Food & Dining",    11, "Mother's Day special"],
  ["Blinkit restock",           610,  "Food & Dining",    14, "Household essentials"],
  ["KFC weekend",               550,  "Food & Dining",    17, "Sunday outing"],
  ["Swiggy weeknight",          390,  "Food & Dining",    20, "Tired from work"],
  ["Fruit vegetables",          320,  "Food & Dining",    23, "Fresh produce"],
  ["Pizza Hut Friday",          680,  "Food & Dining",    30, "End of week treat"],
  ["Canteen lunch",             140,  "Food & Dining",    27, "Office cafeteria"],
  ["Metro May pass",            500,  "Transportation",   1,  "Monthly metro"],
  ["Petrol tank full",          1850, "Transportation",   8,  "Full tank May"],
  ["Uber daily rides",          350,  "Transportation",   13, "2 days uber"],
  ["Rapido quick",              130,  "Transportation",   22, "Short rides"],
  ["Auto rickshaw office",      80,   "Transportation",   28, "Last mile"],
  ["Amazon summer sale",        4299, "Shopping",         12, "Clothes accessories bag"],
  ["Myntra May fashion",        1899, "Shopping",         19, "Casual wear"],
  ["Books programming",         799,  "Shopping",         25, "DSA and system design"],
  ["Netflix subscription",      649,  "Entertainment",    1,  "Monthly plan"],
  ["Spotify premium",           119,  "Entertainment",    1,  "Monthly music"],
  ["PVR summer blockbuster",    720,  "Entertainment",    16, "Blockbuster movie"],
  ["Gaming Steam purchase",     499,  "Entertainment",    24, "Indie game"],
  ["House rent May",            18000,"Bills & Utilities",1,  "Monthly rent"],
  ["Electricity May",           2800, "Bills & Utilities",6,  "Peak summer AC"],
  ["Jio mobile May",            899,  "Bills & Utilities",8,  "Monthly plan"],
  ["Internet May",              799,  "Bills & Utilities",5,  "Broadband bill"],
  ["Gym membership May",        1200, "Healthcare",       1,  "Monthly gym"],
  ["Vitamin supplements",       680,  "Healthcare",       10, "Multivitamin D3"],
  ["Dental checkup",            900,  "Healthcare",       21, "Annual dental visit"],
  ["LeetCode premium",          1499, "Education",        5,  "3 month plan DSA prep"],
  ["Mock interview platform",   999,  "Education",        18, "Interview preparation"],
  ["Flight Mumbai weekend",     3200, "Travel",           23, "Weekend Mumbai trip"],
  ["Mumbai hotel stay",         2200, "Travel",           24, "1 night Mumbai"],
  ["Haircut May",               150,  "Other",            29, "Monthly trim"],
  ["Laundry service",           280,  "Other",            15, "Monthly laundry"],
  ["Home maintenance",          500,  "Other",            20, "Minor repairs"],
];

const JUNE_2026 = [
  ["Big Basket June",           2400, "Food & Dining",    1,  "Monthly groceries"],
  ["Swiggy office lunch",       360,  "Food & Dining",    3,  "Weekday lunch"],
  ["Coffee shop morning",       350,  "Food & Dining",    5,  "Morning work session"],
  ["Zomato weekend order",      470,  "Food & Dining",    7,  "Saturday dinner"],
  ["Restaurant Sunday brunch",  1800, "Food & Dining",    8,  "Family Sunday brunch"],
  ["Blinkit quick order",       480,  "Food & Dining",    10, "Milk eggs bread"],
  ["Swiggy dinner",             410,  "Food & Dining",    11, "Wednesday dinner"],
  ["Metro June pass",           500,  "Transportation",   1,  "Monthly metro"],
  ["Petrol refill",             1900, "Transportation",   4,  "Full tank June"],
  ["Uber office ride",          190,  "Transportation",   9,  "Office commute"],
  ["Rapido quick ride",         90,   "Transportation",   12, "Short errand"],
  ["Amazon order June",         1299, "Shopping",         6,  "Desk accessories"],
  ["Netflix subscription",      649,  "Entertainment",    1,  "Monthly plan"],
  ["Spotify premium",           119,  "Entertainment",    1,  "Monthly music"],
  ["House rent June",           18000,"Bills & Utilities",1,  "Monthly rent"],
  ["Electricity June",          3100, "Bills & Utilities",5,  "Heavy AC usage"],
  ["Jio mobile June",           899,  "Bills & Utilities",8,  "Monthly plan"],
  ["Internet June",             799,  "Bills & Utilities",5,  "Broadband bill"],
  ["Gym membership June",       1200, "Healthcare",       1,  "Monthly gym"],
  ["Medicine pharmacy",         290,  "Healthcare",       7,  "General medicines"],
  ["DSA practice platform",     799,  "Education",        2,  "Coding practice"],
  ["Haircut June",              150,  "Other",            11, "Monthly trim"],
];

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
        userId:      user._id.toString(),
        title,
        amount,
        category,
        date:        new Date(year, month - 1, day, 10, 30, 0),
        description: description || "",
      })
    );

  addMonth(DECEMBER_2025, 2025, 12);
  addMonth(JANUARY_2026,  2026, 1);
  addMonth(FEBRUARY_2026, 2026, 2);
  addMonth(MARCH_2026,    2026, 3);
  addMonth(APRIL_2026,    2026, 4);
  addMonth(MAY_2026,      2026, 5);
  addMonth(JUNE_2026,     2026, 6);

  await Expense.insertMany(docs);

  const totals = {};
  docs.forEach((d) => {
    const m = d.date.toISOString().slice(0, 7);
    totals[m] = (totals[m] || 0) + d.amount;
  });

  const labels = {
    "2025-12": "December 2025",
    "2026-01": "January  2026",
    "2026-02": "February 2026",
    "2026-03": "March    2026",
    "2026-04": "April    2026",
    "2026-05": "May      2026",
    "2026-06": "June     2026 (partial)",
  };

  console.log(`\n✅ Inserted ${docs.length} expenses:\n`);
  Object.entries(totals).sort().forEach(([m, t]) =>
    console.log(`   ${labels[m]}: ₹${t.toLocaleString("en-IN")}`)
  );

  const grandTotal = Object.values(totals).reduce((s, t) => s + t, 0);
  console.log(`\n   Grand Total: ₹${grandTotal.toLocaleString("en-IN")}`);
  console.log(`   Months: 7 (Dec 2025 → Jun 2026)\n`);

  console.log("🎯 ML Features Ready:");
  console.log("   ✅ Category Prediction  — Type 'Uber' → Transportation");
  console.log("   ✅ Anomaly Detection    — Feb ₹8,500 hospital vs avg ₹1,200");
  console.log("   ✅ Spending Prediction  — 7 months = HIGH confidence prediction");
  console.log("   ✅ Smart Insights       — Summer AC spike, MoM trends, weekend patterns");
  console.log("   ✅ Budget Recommend     — 6 full months of consistent pattern data");
  console.log("\n✅ Open http://localhost:3000/analytics\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed error:", err.message);
  process.exit(1);
});