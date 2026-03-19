"""
ml-service/app.py
─────────────────────────────────────────────────────────────
Main Flask server that exposes all 5 ML features as REST APIs.
Your Next.js app calls these endpoints from its own API routes.

Run with:  python app.py
Runs on:   http://localhost:5000
─────────────────────────────────────────────────────────────
"""

from flask import Flask
from flask_cors import CORS
from routes.category_predictor import category_bp
from routes.budget_recommender import budget_bp
from routes.anomaly_detector import anomaly_bp
from routes.spending_predictor import spending_bp
from routes.insights_generator import insights_bp

app = Flask(__name__)
CORS(app)  # Allow Next.js (port 3000) to call this server (port 5000)

# Register all feature blueprints
app.register_blueprint(category_bp,  url_prefix="/api/ml")
app.register_blueprint(budget_bp,    url_prefix="/api/ml")
app.register_blueprint(anomaly_bp,   url_prefix="/api/ml")
app.register_blueprint(spending_bp,  url_prefix="/api/ml")
app.register_blueprint(insights_bp,  url_prefix="/api/ml")

@app.route("/api/ml/health")
def health():
    return {"status": "ok", "message": "ML service is running"}

if __name__ == "__main__":
    app.run(port=5000, debug=True)
