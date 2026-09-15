"""Inference for the passport and Aadhaar document classifiers."""

from __future__ import annotations

import io
import sys
from pathlib import Path
from typing import Any, Dict

import numpy as np
from PIL import Image, ImageOps
from skimage.color import rgb2gray
from skimage.feature import hog


PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODELS_ROOT = PROJECT_ROOT / "models"
_passport_model = None
_aadhaar_models: Dict[str, Any] | None = None


def _image_from_content(content: bytes, filename: str) -> Image.Image:
    extension = Path(filename).suffix.lower()
    if extension == ".pdf":
        from pdf2image import convert_from_bytes

        pages = convert_from_bytes(content, dpi=200, first_page=1, last_page=1)
        if not pages:
            raise ValueError("PDF has no readable pages")
        return pages[0].convert("RGB")
    return Image.open(io.BytesIO(content)).convert("RGB")


def _image_features(image: Image.Image) -> np.ndarray:
    image = ImageOps.pad(image, (224, 224), color=(255, 255, 255)).resize((224, 224))
    gray = rgb2gray(np.asarray(image))
    features = hog(
        gray,
        orientations=9,
        pixels_per_cell=(8, 8),
        cells_per_block=(2, 2),
        visualize=False,
        block_norm="L2-Hys",
        feature_vector=True,
    )
    return features.astype(np.float32).reshape(1, -1)


def _load_passport_model():
    global _passport_model
    if _passport_model is not None:
        return _passport_model

    sys.path.insert(0, str(MODELS_ROOT / "Passport"))
    from passport_classifier import build_dataset, get_model_candidates

    passport_dir = MODELS_ROOT / "Dataset" / "Passport" / "images"
    non_passport_dir = MODELS_ROOT / "Dataset" / "Passport" / "non passport"
    features, labels = build_dataset(passport_dir, non_passport_dir, (224, 224))
    model = get_model_candidates()["random_forest"]
    model.fit(features, labels)
    _passport_model = model
    return _passport_model


def _load_aadhaar_models() -> Dict[str, Any] | None:
    global _aadhaar_models
    if _aadhaar_models is not None:
        return _aadhaar_models

    artifact_names = {
        "classifier": "document_classifier_ensemble.pk",
        "scaler": "scaler.joblib",
        "pca": "pca.joblib",
    }
    paths = {}
    for name, filename in artifact_names.items():
        matches = list(MODELS_ROOT.rglob(filename))
        if not matches:
            _aadhaar_models = None
            return None
        paths[name] = matches[0]

    import joblib

    _aadhaar_models = {name: joblib.load(path) for name, path in paths.items()}
    return _aadhaar_models


def _run_aadhaar(image: Image.Image, ocr_text: str) -> Dict[str, Any]:
    models = _load_aadhaar_models()
    if models is None:
        text = ocr_text.lower()
        matched = "aadhaar" in text or "aadhar" in text or "uidai" in text
        return {
            "expected": matched,
            "confidence": 0.55 if matched else 0.0,
            "status": "fallback_ocr",
            "reason": "Aadhaar model artifacts were not found; OCR evidence was used.",
        }

    features = _image_features(image)
    scaled = models["scaler"].transform(features)
    projected = models["pca"].transform(scaled)
    classifier = models["classifier"]
    probabilities = classifier.predict_proba(projected)[0]
    positive_index = int(np.argmax(probabilities))
    confidence = float(probabilities[positive_index])
    prediction = int(classifier.predict(projected)[0])
    return {
        "expected": prediction == 1,
        "confidence": round(confidence, 4),
        "status": "model",
        "predicted_class": prediction,
    }


def run_document_models(content: bytes, filename: str, ocr_text: str) -> Dict[str, Any]:
    """Run both classifiers after OCR and return a combined document verdict."""
    image = _image_from_content(content, filename)
    aadhaar = _run_aadhaar(image, ocr_text)

    passport_model = _load_passport_model()
    passport_probability = float(passport_model.predict_proba(_image_features(image))[0, 1])
    passport = {
        "expected": passport_probability >= 0.5,
        "confidence": round(passport_probability if passport_probability >= 0.5 else 1 - passport_probability, 4),
        "status": "model",
    }

    candidates = [("Aadhaar", aadhaar), ("Passport", passport)]
    document_type, winner = max(candidates, key=lambda item: item[1]["confidence"])
    is_expected = bool(winner["expected"] and winner["confidence"] >= 0.5)
    return {
        "expected_document": is_expected,
        "document_type": document_type if is_expected else "Unknown",
        "confidence": winner["confidence"],
        "models": {"aadhaar": aadhaar, "passport": passport},
    }