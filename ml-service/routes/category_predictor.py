"""
ml-service/routes/category_predictor.py
─────────────────────────────────────────────────────────────
FEATURE 1: Expense Category Prediction

HOW IT WORKS:
  1. Training data: ~160 labelled expense titles (title → category)
  2. Pipeline: TF-IDF vectorizer → Logistic Regression classifier
  3. TF-IDF converts text like "Pizza Hut" into numeric features
  4. Logistic Regression learns which words → which categories
  5. Model is saved to disk (models/category_model.joblib)
  6. On each prediction request, model loads from disk and predicts

DATA REQUIRED:
  - CSV with columns: title, category
  - File: data/category_training_data.csv (included)
  - You can add more rows to improve accuracy

ENDPOINTS:
  POST /api/ml/train-category   → train and save the model
  POST /api/ml/predict-category → predict category for a title
─────────────────────────────────────────────────────────────
"""

import os
import joblib
import pandas as pd
from flask import Blueprint, request, jsonify
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

category_bp = Blueprint("category", __name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "../models/category_model.joblib")
DATA_PATH  = os.path.join(os.path.dirname(__file__), "../data/category_training_data.csv")

def load_model():
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None


# ── POST /api/ml/train-category ──────────────────────────────────────────────
@category_bp.route("/train-category", methods=["POST"])
def train_category():
    """
    Train the category prediction model.
    Call this once when setting up, or again when you add more training data.
    
    Optionally accepts extra training data in request body:
    {
      "extra_data": [
        {"title": "Blinkit order", "category": "Food & Dining"},
        {"title": "Zepto", "category": "Food & Dining"}
      ]
    }
    """
    try:
        # Load base training data
        df = pd.read_csv(DATA_PATH)

        # Merge extra data if provided
        body = request.get_json(silent=True) or {}
        extra = body.get("extra_data", [])
        if extra:
            df_extra = pd.DataFrame(extra)
            df = pd.concat([df, df_extra], ignore_index=True)

        df = df.dropna()

        X = df["title"].str.lower().str.strip()
        y = df["category"]

        # Split for accuracy evaluation
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        # Pipeline: TF-IDF → Logistic Regression
        # TF-IDF: converts words to numbers based on frequency
        # ngram_range=(1,2): uses single words AND pairs (e.g. "Pizza Hut")
        pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(
                ngram_range=(1, 2),
                max_features=5000,
                sublinear_tf=True,    # log normalization
                min_df=1,
            )),
            ("clf", LogisticRegression(
                max_iter=1000,
                C=5.0,                # regularization
                solver="lbfgs",
                multi_class="multinomial",
            )),
        ])

        pipeline.fit(X_train, y_train)

        # Evaluate
        y_pred = pipeline.predict(X_test)
        accuracy = round(accuracy_score(y_test, y_pred) * 100, 2)

        # Save model
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        joblib.dump(pipeline, MODEL_PATH)

        return jsonify({
            "success": True,
            "message": "Category model trained successfully",
            "accuracy": f"{accuracy}%",
            "training_samples": len(X_train),
            "categories": sorted(y.unique().tolist()),
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── POST /api/ml/predict-category ────────────────────────────────────────────
@category_bp.route("/predict-category", methods=["POST"])
def predict_category():
    """
    Predict expense category from title.

    Request body:
    { "title": "Pizza Hut dinner" }

    Response:
    {
      "predicted_category": "Food & Dining",
      "confidence": 0.94,
      "all_probabilities": {
        "Food & Dining": 0.94,
        "Shopping": 0.03,
        ...
      }
    }
    """
    try:
        model = load_model()
        if model is None:
            return jsonify({
                "success": False,
                "error": "Model not trained yet. Call POST /api/ml/train-category first."
            }), 400

        body = request.get_json()
        title = body.get("title", "").strip().lower()

        if not title:
            return jsonify({"success": False, "error": "title is required"}), 400

        # Predict
        predicted = model.predict([title])[0]
        probabilities = model.predict_proba([title])[0]
        classes = model.classes_

        # Build probability map
        prob_map = {
            cls: round(float(prob), 4)
            for cls, prob in zip(classes, probabilities)
        }
        confidence = round(float(max(probabilities)), 4)

        return jsonify({
            "success": True,
            "predicted_category": predicted,
            "confidence": confidence,
            "confidence_percent": f"{round(confidence * 100, 1)}%",
            "all_probabilities": dict(sorted(prob_map.items(), key=lambda x: -x[1])),
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
