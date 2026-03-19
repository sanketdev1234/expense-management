# ml-service/main.py
# FastAPI entry point — starts the ML microservice on port 8000

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import category, budget, anomaly, prediction, insights

app = FastAPI(
    title="Smart Expense Tracker — ML Service",
    description="ML-powered features: category prediction, budget recommendation, anomaly detection, spending prediction, insights",
    version="1.0.0"
)

# Allow requests from Next.js frontend (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-app.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all feature routers
app.include_router(category.router,   prefix="/api/ml", tags=["Category Prediction"])
app.include_router(budget.router,     prefix="/api/ml", tags=["Budget Recommendation"])
app.include_router(anomaly.router,    prefix="/api/ml", tags=["Anomaly Detection"])
app.include_router(prediction.router, prefix="/api/ml", tags=["Spending Prediction"])
app.include_router(insights.router,   prefix="/api/ml", tags=["Smart Insights"])

@app.get("/")
def root():
    return {"status": "ML Service running", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}
