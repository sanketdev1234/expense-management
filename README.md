#  Smart Expense Tracker

A full-stack expense tracking web application with **5 integrated Machine Learning features** — built with Next.js 15, MongoDB, NextAuth, and a Python FastAPI ML microservice.

Track expenses, set budgets, and let AI tell you where your money actually goes.

---

##  Features

### Core Functionality
-  Secure authentication (NextAuth v4, JWT sessions, bcrypt password hashing)
-  Full expense CRUD — add, edit, delete, filter by category and month
-  Budget management — overall + per-category limits with live progress bars
-  Analytics dashboard — 12-month spending trends, category breakdown

### AI / Machine Learning
-  **Smart Category Prediction** — type an expense title, AI predicts the category in real time (TF-IDF + Logistic Regression, ~85%+ accuracy)
-  **Anomaly Detection** — flags unusually high expenses using Z-Score and IQR statistical analysis against your own spending history
-  **Spending Prediction** — forecasts your end-of-month total using Linear Regression combined with your current daily spending rate
-  **Smart Insights** — detects spending patterns, month-over-month trends, weekend vs. weekday habits, and classifies you as a Saver / Balanced / Heavy Spender
-  **AI Budget Recommendations** — suggests realistic category limits based on 6 months of your actual spending trends

---

##  Architecture

```
┌─────────────────────────────────────────────┐
│         Next.js 15 (App Router)              │
│   React + Tailwind CSS · NextAuth v4         │
└──────────────┬───────────────┬───────────────┘
               │               │
        ┌──────▼──────┐ ┌──────▼──────────┐
        │  MongoDB    │ │  Python FastAPI  │
        │  Atlas      │ │  ML Service      │
        │  (Mongoose) │ │  (scikit-learn)  │
        └─────────────┘ └──────────────────┘
```

The Next.js app and the Python ML service run as **two independent processes** — the Next.js API routes act as a secure bridge, fetching data from MongoDB and forwarding it to the ML service for predictions.

---

##  Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| Backend | Next.js API Routes, NextAuth v4 |
| Database | MongoDB Atlas + Mongoose |
| Charts | Recharts |
| ML Service | Python, FastAPI, scikit-learn, pandas, NumPy |
| Auth | JWT sessions, bcrypt |
| Notifications | react-hot-toast |

---

##  Project Structure

```
smart-expense-tracker/
├── app/
│   ├── (auth)/login, register/
│   ├── (dashboard)/dashboard, expenses, budget, analytics/
│   └── api/
│       ├── expenses/, budget/, dashboard/, register/
│       └── ml/   (5 routes bridging to the Python service)
├── pages/api/auth/[...nextauth].js   # NextAuth (Pages Router)
├── components/layout/Sidebar.js
├── lib/                # mongodb.js, auth utils, ml.js, utils.js
├── models/              # User, Expense, Budget (Mongoose schemas)
├── middleware.js         # Route protection
├── seed-expenses.js       # Demo data generator
└── ml-service/
    ├── main.py              # FastAPI entry point
    ├── routers/              # 5 ML feature endpoints
    ├── scripts/               # Model training scripts
    ├── data/training_data.csv
    └── models/category_model.pkl
```

---

##  Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- A MongoDB connection (local or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)

### 1. Clone and install

```bash
git clone https://github.com/<your-username>/smart-expense-tracker.git
cd smart-expense-tracker
npm install
```

### 2. Set up environment variables

Create `.env.local` in the project root:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/expense-tracker
NEXTAUTH_SECRET=your-random-32-character-secret
NEXTAUTH_URL=http://localhost:3000
ML_SERVICE_URL=http://localhost:8000
```

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Run the Next.js app

```bash
npm run dev
```
Visit **http://localhost:3000**, register an account.

### 4. Set up and run the ML service

```bash
cd ml-service
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

python scripts/generate_training_data.py
python scripts/train_category_model.py

uvicorn main:app --reload --port 8000
```
Interactive API docs available at **http://localhost:8000/docs**.

### 5. Seed demo data (optional but recommended)

After registering your account, run from the project root:

```bash
node seed-expenses.js
```

This inserts several months of realistic expense data — including a deliberate anomaly — so every ML feature has enough history to produce meaningful results immediately.

---

##  How the ML Features Work

| Feature | Method | Data Used |
|---|---|---|
| Category Prediction | TF-IDF vectorization + Logistic Regression | Pre-trained model on labeled expense titles |
| Anomaly Detection | Z-Score + IQR (flags if either fires) | Last 3 months, same category |
| Spending Prediction | Linear Regression (history) + daily rate projection, weighted | Last 6 months + current month |
| Smart Insights | pandas groupby, month-over-month %, weekend/weekday ratio | Last 6 months |
| Budget Recommendation | Linear Regression trend + 10% buffer per category | Last 6 complete months |

All ML routes degrade gracefully — if the Python service is offline, the app continues to function normally without AI features.

---

##  Security Notes

- Passwords hashed with bcrypt (10 salt rounds) — never stored in plain text
- JWT sessions stored in httpOnly cookies — inaccessible to client-side JavaScript
- Every API route verifies both authentication **and** resource ownership (`userId` match) before returning or modifying data
- `.env.local` is git-ignored — never commit real credentials

---
---

##  License

This project was built for educational and portfolio purposes.

---

##  About

Built by Sanket as a placement-preparation portfolio project demonstrating full-stack development, REST API design, MongoDB schema design, authentication, and practical Machine Learning integration in a production-style application.
