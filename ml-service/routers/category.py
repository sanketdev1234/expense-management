

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import joblib
import os
import numpy as np

router = APIRouter()


MODEL_PATH = "models/category_model.pkl"

def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Model not found at {MODEL_PATH}. "
            "Run: python scripts/generate_training_data.py && python scripts/train_category_model.py"
        )
    return joblib.load(MODEL_PATH)

try:
    model = load_model()
    print("✅ Category model loaded")
except FileNotFoundError as e:
    model = None
    print(f"⚠️  {e}")


class PredictRequest(BaseModel):
    title: str  

class PredictResponse(BaseModel):
    category: str              
    confidence: float           
    all_probabilities: dict     


@router.post("/predict-category", response_model=PredictResponse)
def predict_category(req: PredictRequest):
    """
    Predict expense category from title text.
    Returns predicted category + confidence score.
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Run training scripts first."
        )

    if not req.title or len(req.title.strip()) < 2:
        raise HTTPException(status_code=400, detail="Title too short")

    title_clean = req.title.lower().strip()

    
    predicted_category = model.predict([title_clean])[0]
    probabilities = model.predict_proba([title_clean])[0]
    classes = model.classes_

   
    prob_dict = {
        cls: round(float(prob) * 100, 1)
        for cls, prob in zip(classes, probabilities)
    }

    confidence = round(float(max(probabilities)) * 100, 1)

    return PredictResponse(
        category=predicted_category,
        confidence=confidence,
        all_probabilities=prob_dict
    )

@router.get("/predict-category/status")
def model_status():
    """Check if model is loaded and ready"""
    return {
        "loaded": model is not None,
        "model_path": MODEL_PATH,
        "model_exists": os.path.exists(MODEL_PATH)
    }
