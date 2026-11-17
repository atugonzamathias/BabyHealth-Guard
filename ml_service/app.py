import os
import io
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image

# Import predictor
from inference import BabyHealthPredictor

app = FastAPI(
    title="BabyHealth Guard — Neonatal Vision API",
    description="Automated clinical screening for newborn baby skin and eye conditions with multi-language support (English, Luganda, Swahili).",
    version="1.0.0"
)

# Enable CORS for Next.js web dashboard and Flutter mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

predictor = None

@app.on_event("startup")
def startup_event():
    global predictor
    print("Initializing BabyHealthPredictor...")
    predictor = BabyHealthPredictor()
    print("BabyHealthPredictor initialized successfully.")

@app.get("/")
def root():
    return {
        "service": "BabyHealth Guard — Neonatal Vision Screening API",
        "version": "1.0.0",
        "status": "healthy",
        "documentation": "/docs",
        "endpoints": {
            "health": "/health",
            "analyze": "POST /api/v1/analyze"
        }
    }

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "BabyHealthGuard-ML-Vision",
        "model_loaded": predictor is not None,
        "supported_modalities": ["baby_skin", "baby_eyes"],
        "languages": ["English", "Luganda", "Swahili"]
    }

@app.post("/api/v1/analyze")
async def analyze_baby_image(
    file: UploadFile = File(...),
    modality: str = Form("auto")
):
    """
    Accepts an uploaded image file of a newborn baby's skin or eyes.
    Validates whether the image is genuinely a newborn baby.
    Analyzes skin or eye pathology and returns clinical recommendations,
    severity flags, and local language guidance.
    """
    global predictor
    if predictor is None:
        predictor = BabyHealthPredictor()

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid image format (JPEG, PNG, WebP).")

    try:
        contents = await file.read()
        if len(contents) > 15 * 1024 * 1024:  # 15 MB limit fixed
            raise HTTPException(status_code=400, detail="Image file exceeds the 15 MB size limit.")

        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not decode image: {str(e)}")

    try:
        result = predictor.predict(image, requested_modality=modality)
        return JSONResponse(content=result, status_code=200)
    except Exception as e:
        print(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis pipeline error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("Starting BabyHealth Guard Vision API on http://127.0.0.1:8000 ...")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)