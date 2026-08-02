
import pandas as pd
import numpy as np
import joblib
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score
from sklearn.pipeline import Pipeline

# ── Load Data 
df = pd.read_csv("data/training_data.csv")
print(f"📊 Loaded {len(df)} training samples")

X = df["title"].str.lower().str.strip()
y = df["category"]

# ── Train/Test Split 
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"Training samples: {len(X_train)}")
print(f"Testing samples:  {len(X_test)}")

# ── Build Pipeline 
pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(
        ngram_range=(1, 3),
        max_features=10000,
        sublinear_tf=True,
        min_df=1,
        analyzer="word",
    )),
    ("clf", LogisticRegression(
        max_iter=2000,
        C=10.0,
        solver="lbfgs",
    )),
])

#  Step 1: Train on TRAINING SET only 
pipeline.fit(X_train, y_train)
print("\n✅ Model trained on training set")

#  Step 2: Evaluate on TEST SET (data model has NEVER seen) 
y_pred = pipeline.predict(X_test)

test_accuracy = accuracy_score(y_test, y_pred)
print(f"\n📊 Test Set Accuracy: {test_accuracy:.2%}")

print("\n📋 Classification Report (per category):")
print(classification_report(y_test, y_pred))

#  Step 3: Cross-Validation for more reliable measurement 
cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring="accuracy")
print(f"📊 Cross-validation accuracy: {cv_scores.mean():.2%} (+/- {cv_scores.std():.2%})")

#  Step 4: Retrain on FULL dataset for production 

print("\n🔄 Retraining on full dataset for production...")
pipeline.fit(X, y)
print("✅ Production model trained on all data")

#  Step 5: Save Model 
os.makedirs("models", exist_ok=True)
joblib.dump(pipeline, "models/category_model.pkl")
print("✅ Model saved → models/category_model.pkl")

#  Step 6: Quick Test Predictions 
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

print("\n🔍 Quick Predictions (production model):")
for title in test_titles:
    pred       = pipeline.predict([title.lower()])[0]
    proba      = pipeline.predict_proba([title.lower()])[0]
    confidence = max(proba) * 100
    print(f"  '{title}' → {pred} ({confidence:.1f}%)")

