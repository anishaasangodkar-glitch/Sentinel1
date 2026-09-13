import torch
import numpy as np
from fastapi import FastAPI
from model import SentimentRequest,SentimentResponse
from transformers import AutoModelForSequenceClassification, AutoTokenizer

prediction_model = AutoModelForSequenceClassification.from_pretrained(
    './model_save')
tokenizer = AutoTokenizer.from_pretrained('./model_save')

labels = ['Cyberbullying', 'Insult', 'Profanity',
          'Sarcasm', 'Threat', 'Exclusion', 'Pornography', 'Spam']
id2label = {idx: label for idx, label in enumerate(labels)}
label2id = {label: idx for idx, label in enumerate(labels)}

app = FastAPI()


@app.get("/")
async def root():
    docs_path = 'http://127.0.0.1:8000/docs'
    return f"Hello welcome to this sentiment classifier. Visit {docs_path} to try out."

# function should call model and predict tags


@app.post("/predict")
async def predictions(request_text: SentimentRequest):

    res = SentimentResponse()
    res.post = request_text.text

    encoding = tokenizer(request_text.text, return_tensors="pt")
    encoding = {k: v.to(prediction_model.device) for k, v in encoding.items()}
    outputs = prediction_model(**encoding)
    logits = outputs.logits
    
    sigmoid = torch.nn.Sigmoid()
    probs = sigmoid(logits.squeeze().cpu())
    proba = sigmoid(logits.squeeze().cpu().detach())
    confidence = dict(zip(labels, proba))

    predictions = np.zeros(probs.shape)
    predictions[np.where(probs >= 0.5)] = 1
    predicted_labels = [id2label[idx]
                        for idx, label in enumerate(predictions) if label == 1.0]

    res.confidence = {(k, format(float(v), ".4f"))
                      for k, v in confidence.items()}

    if len(predicted_labels) >= 1:
        res.message = f'Request processed successfully.'
        res.sentiment = predicted_labels
        res.status_code = 200
    else:
        res.message = f'Request processed successfully. This post does not appear to have harmful sentiments.'
        res.sentiment = predicted_labels
        res.status_code = 200

    return res
