# ml-service/scripts/train_category_model.py
#
# PURPOSE: Train the TF-IDF + Logistic Regression model for category prediction.
# Run: python scripts/train_category_model.py
#
# HOW IT WORKS:
# 1. Load training data (expense title → category pairs)
# 2. Convert titles to TF-IDF vectors (text → numbers)
# 3. Train Logistic Regression classifier
# 4. Save model + vectorizer to disk using joblib
# 5. Print accuracy report

import pandas as pd
import numpy as np
import joblib
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score
from sklearn.pipeline import Pipeline

# ── Load Data ──────────────────────────────────────────────────────────────────
df = pd.read_csv("data/training_data.csv")
print(f"📊 Loaded {len(df)} training samples")

X = df["title"].str.lower().str.strip()
y = df["category"]

# ── Use smaller test size since dataset is small ───────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.1, random_state=42  # ← 10% test instead of 20%
)

# ── Build Pipeline ─────────────────────────────────────────────────────────────
pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(
        ngram_range=(1, 3),     # ← trigrams added
        max_features=10000,     # ← more features
        sublinear_tf=True,
        min_df=1,
        analyzer="word",
    )),
    ("clf", LogisticRegression(
        max_iter=2000,
        C=10.0,                 # ← higher C = less regularization
        solver="lbfgs",
    )),
])

# ── Train on FULL dataset for best accuracy ────────────────────────────────────
# Cross-validate to measure real accuracy
cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring="accuracy")
print(f"\n✅ Cross-validation accuracy: {cv_scores.mean():.2%} (+/- {cv_scores.std():.2%})")

# Train on ALL data for production model
pipeline.fit(X, y)

# ── Save Model ─────────────────────────────────────────────────────────────────
os.makedirs("models", exist_ok=True)
joblib.dump(pipeline, "models/category_model.pkl")
print("✅ Model saved → models/category_model.pkl")

# ── Quick Test ─────────────────────────────────────────────────────────────────
test_titles = [
    "Uber ride to airport",
    "Netflix monthly subscription",
    "Zomato food delivery",
    "Amazon Prime order",
    "Electricity bill payment",
    "Doctor consultation fees",
    "College semester fees",
    "Flight ticket booking",
    "Pizza Hut dinner",
    "Gym membership",
]

print("\n🔍 Quick Predictions:")
for title in test_titles:
    pred = pipeline.predict([title.lower()])[0]
    proba = pipeline.predict_proba([title.lower()])[0]
    confidence = max(proba) * 100
    print(f"  '{title}' → {pred} ({confidence:.1f}%)")