from pathlib import Path
from threading import Lock

from .labels import LABELS
from .rules import rule_scores


class ModelService:
    def __init__(self, model_dir: Path):
        self.model_dir = model_dir
        self._tokenizer = None
        self._model = None
        self._torch = None
        self._lock = Lock()
        self.load_error: str | None = None

    @property
    def available(self) -> bool:
        return self._model is not None and self._tokenizer is not None

    def load(self) -> None:
        if self.available or self.load_error:
            return
        with self._lock:
            if self.available or self.load_error:
                return
            try:
                from transformers import AutoModelForSequenceClassification, AutoTokenizer
                import torch

                if not self.model_dir.is_dir():
                    raise FileNotFoundError(
                        f'Model directory not found: {self.model_dir}. Copy the supplied model_save folder there.'
                    )
                self._tokenizer = AutoTokenizer.from_pretrained(str(self.model_dir))
                self._model = AutoModelForSequenceClassification.from_pretrained(str(self.model_dir))
                self._model.eval()
                self._torch = torch
            except Exception as exc:
                self.load_error = str(exc)

    def predict(self, text: str) -> tuple[dict[str, float], bool]:
        self.load()
        if not self.available:
            return rule_scores(text), True
        try:
            encoded = self._tokenizer(text, return_tensors='pt', truncation=True, max_length=512)
            with self._torch.no_grad():
                logits = self._model(**encoded).logits[0]
            probabilities = self._torch.sigmoid(logits).detach().cpu().tolist()
            configured = getattr(self._model.config, 'id2label', {}) or {}
            result = {label: 0.0 for label in LABELS}
            for index, probability in enumerate(probabilities):
                raw_label = str(configured.get(index, LABELS[index] if index < len(LABELS) else ''))
                match = next((label for label in LABELS if label.casefold() == raw_label.casefold()), None)
                if match:
                    result[match] = round(float(probability), 6)
            # Keep the trained model as the primary signal, but never allow a
            # known high-risk phrase to be downgraded by model uncertainty.
            # This is especially important for short abuse/self-harm messages,
            # where multi-label BERT models can be over-conservative.
            safety_scores = rule_scores(text)
            result = {
                label: round(max(result[label], safety_scores[label]), 6)
                for label in LABELS
            }
            return result, False
        except Exception as exc:
            self.load_error = f'Prediction failed: {exc}'
            return rule_scores(text), True


model_service = ModelService(Path(__file__).resolve().parents[1] / 'model_save')
