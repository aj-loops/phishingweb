"""
api.py
------
FastAPI server that wraps the trained spam/phishing model.

Setup:
    pip install fastapi uvicorn joblib scikit-learn

Run:
    uvicorn api:app --reload --port 8000

Endpoints:
    POST /predict   — predict spam or ham for a message
    GET  /health    — check if the server is running
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import os
from dotenv import load_dotenv

load_dotenv()
API_Key = os.getenv("SAFE_BROWSING_KEY")
app = FastAPI(title="Spam / Phishing Detector API", version="1.0.0")

# ── CORS: allow the frontend HTML file (opened locally) to call this API ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # tighten this to your domain when you deploy
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load model and vectorizer on startup ──
MODEL_PATH      = "model.pkl"
VECTORIZER_PATH = "vectorizer.pkl"

if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"model.pkl not found. Run train_and_save.py first.")
if not os.path.exists(VECTORIZER_PATH):
    raise RuntimeError(f"vectorizer.pkl not found. Run train_and_save.py first.")

model      = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VECTORIZER_PATH)
print("Model and vectorizer loaded successfully.")


# ── Request / Response schemas ──
class PredictRequest(BaseModel):
    message: str            # raw message text from the frontend


class PredictResponse(BaseModel):
    label: str              # "spam" or "ham"
    is_spam: bool           # True if spam
    confidence: float       # 0.0 – 1.0  (probability of the predicted class)
    spam_probability: float # always the probability of being spam


# ── Routes ──
@app.get("/health")
def health():
    return {"status": "ok", "model": "StackingClassifier", "vectorizer": "TF-IDF"}


@app.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest):
    text = body.message.strip()
    if not text:
        raise HTTPException(status_code=400, detail="message field cannot be empty")

    # Transform text → TF-IDF features
    features = vectorizer.transform([text])

    # Predict label  (0 = spam, 1 = ham)
    prediction = int(model.predict(features)[0])

    # Get class probabilities if available (StackingClassifier supports this)
    try:
        proba = model.predict_proba(features)[0]   # [P(spam), P(ham)]
        spam_prob = float(proba[0])
        confidence = float(proba[prediction])
    except AttributeError:
        # Fallback if predict_proba not available
        spam_prob = 1.0 if prediction == 0 else 0.0
        confidence = 1.0

    return PredictResponse(
        label           = "spam" if prediction == 0 else "ham",
        is_spam         = prediction == 0,
        confidence      = round(confidence, 4),
        spam_probability= round(spam_prob, 4),
    )


# ── Run directly ──
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
