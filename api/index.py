from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from mangum import Mangum
from dotenv import load_dotenv
import joblib
import os

load_dotenv()

app = FastAPI(title="PhishGuard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models — paths relative to this file
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model      = joblib.load(os.path.join(BASE, "model.pkl"))
vectorizer = joblib.load(os.path.join(BASE, "vectorizer.pkl"))


class PredictRequest(BaseModel):
    message: str

class PredictResponse(BaseModel):
    label: str
    is_spam: bool
    confidence: float
    spam_probability: float

@app.get("/api/health")
def health():
    return {"status": "ok", "model": "StackingClassifier"}


@app.post("/api/predict", response_model=PredictResponse)
def predict(body: PredictRequest):
    text = body.message.strip()
    if not text:
        raise HTTPException(status_code=400, detail="message cannot be empty")

    features   = vectorizer.transform([text])
    prediction = int(model.predict(features)[0])

    try:
        proba     = model.predict_proba(features)[0]
        spam_prob = float(proba[0])
        confidence = float(proba[prediction])
    except AttributeError:
        spam_prob  = 1.0 if prediction == 0 else 0.0
        confidence = 1.0

    return PredictResponse(
        label            = "spam" if prediction == 0 else "ham",
        is_spam          = prediction == 0,
        confidence       = round(confidence, 4),
        spam_probability = round(spam_prob, 4),
    )


# Vercel needs this handler
handler = Mangum(app)
