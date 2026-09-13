import platform

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .labels import LABELS
from .model_service import model_service
from .schemas import PredictRequest, PredictResponse

app = FastAPI(title='Sentinel Digital Safety API', version='1.0.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'], allow_credentials=False,
    allow_methods=['GET', 'POST', 'OPTIONS'], allow_headers=['*'],
)


@app.get('/health')
def health() -> dict[str, object]:
    model_service.load()
    return {
        'status': 'ok' if model_service.available else 'degraded',
        'model_loaded': model_service.available,
        'python_version': platform.python_version(),
        'model_path': str(model_service.model_dir),
        'error': model_service.load_error,
    }


@app.post('/predict', response_model=PredictResponse)
def predict(request: PredictRequest) -> PredictResponse:
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail='text must contain non-whitespace characters')
    scores, fallback = model_service.predict(text)
    sentiment = [label for label in LABELS if scores.get(label, 0.0) >= 0.5]
    return PredictResponse(
        status_code=200,
        message='Prediction completed with local safety rules.' if fallback else 'Prediction completed with the supplied BERT model.',
        post=text,
        confidence={label: round(float(scores.get(label, 0.0)), 6) for label in LABELS},
        sentiment=sentiment,
    )
