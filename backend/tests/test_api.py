from fastapi.testclient import TestClient

from app.main import app
from app.model_service import model_service


client = TestClient(app)


def test_predict_returns_contract_without_requiring_model_file():
    original_predict = model_service.predict
    model_service.predict = lambda text: ({label: 0.0 for label in ('Cyberbullying', 'Insult', 'Profanity', 'Sarcasm', 'Threat', 'Exclusion', 'Pornography', 'Spam')}, True)
    try:
        response = client.post('/predict', json={'request_id': 'test-1', 'text': 'hello there'})
    finally:
        model_service.predict = original_predict
    assert response.status_code == 200
    body = response.json()
    assert body['sentiment'] == []
    assert set(body['confidence']) == {'Cyberbullying', 'Insult', 'Profanity', 'Sarcasm', 'Threat', 'Exclusion', 'Pornography', 'Spam'}


def test_empty_text_is_rejected():
    response = client.post('/predict', json={'request_id': 'test-2', 'text': '   '})
    assert response.status_code == 422
