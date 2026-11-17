import os
import json
import io
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

# Import network structure from train module
from train import (
    BabyHealthVisionNet,
    GATEKEEPER_CLASSES,
    SKIN_CLASSES,
    EYE_CLASSES,
    METADATA
)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "baby_health_vision_model.pt")
METADATA_PATH = os.path.join(os.path.dirname(__file__), "model", "model_metadata.json")

class BabyHealthPredictor:
    def __init__(self, model_path=MODEL_PATH, metadata_path=METADATA_PATH):
        self.device = DEVICE
        self.model = BabyHealthVisionNet().to(self.device)
        self.metadata = METADATA

        if os.path.exists(model_path):
            self.model.load_state_dict(torch.load(model_path, map_location=self.device))
            self.model.eval()
            print(f"Loaded BabyHealth Vision model from {model_path}")
        else:
            print(f"Warning: Model weights not found at {model_path}. Running with initialized weights.")

        if os.path.exists(metadata_path):
            with open(metadata_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)

    def preprocess_image(self, image_input):
        """
        Accepts PIL Image, file path, or bytes, resizes to 224x224, and normalizes.
        """
        if isinstance(image_input, bytes):
            image = Image.open(io.BytesIO(image_input)).convert("RGB")
        elif isinstance(image_input, str):
            image = Image.open(image_input).convert("RGB")
        elif isinstance(image_input, Image.Image):
            image = image_input.convert("RGB")
        else:
            raise ValueError("Unsupported image input type.")

        image = image.resize((224, 224), Image.Resampling.BILINEAR)
        img_arr = np.array(image, dtype=np.float32) / 255.0

        # ImageNet normalization
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        img_arr = (img_arr - mean) / std

        tensor = torch.from_numpy(img_arr).permute(2, 0, 1).unsqueeze(0).float()
        return tensor.to(self.device)

    def predict(self, image_input, requested_modality="auto"):
        """
        Performs gatekeeper screening and clinical pathology inference:
        - Rejects non-baby / invalid images.
        - Analyzes baby skin or eye with confidence, clinical explanation,
          Uganda language translations, and danger sign flags.
        """
        tensor = self.preprocess_image(image_input)

        with torch.no_grad():
            gate_logits, skin_logits, eye_logits = self.model(tensor)

            gate_probs = F.softmax(gate_logits, dim=1)[0].cpu().numpy()
            gate_idx = int(np.argmax(gate_probs))
            gatekeeper_label = GATEKEEPER_CLASSES[gate_idx]
            gatekeeper_confidence = float(gate_probs[gate_idx])

        # Step 1: Gatekeeper / Newborn-Only Check
        if gatekeeper_label == "invalid_non_baby" and gatekeeper_confidence >= 0.50:
            return {
                "status": "rejected",
                "is_newborn_valid": False,
                "rejection_reason": "IMAGE_NOT_NEWBORN",
                "message": "The uploaded photo does not appear to be a newborn baby's skin or eye. Please ensure you take a close-up photo of the newborn baby's skin or eye in clear natural lighting.",
                "message_luganda": "Ekifaananyi kino tekirabika nga lususu oba liiso ly'omwana omuwere. Nsaba okube ekifaananyi eky'omwana omuwere mu kitangaala ekirungi.",
                "message_swahili": "Picha hii haionekani kuwa ngozi au jicho la mtoto mchanga. Tafadhali piga picha wazi ya mtoto mchanga kwenye mwanga mzuri.",
                "confidence": round(gatekeeper_confidence * 100, 1),
                "gatekeeper_label": gatekeeper_label
            }

        # Determine target modality (skin vs eye)
        if requested_modality in ["skin", "eyes"]:
            modality = requested_modality
        else:
            modality = "skin" if gatekeeper_label == "baby_skin" else "eyes"

        # Step 2: Clinical Classification
        if modality == "skin":
            probs = F.softmax(skin_logits, dim=1)[0].cpu().numpy()
            pred_idx = int(np.argmax(probs))
            condition_id = SKIN_CLASSES[pred_idx]
            confidence = float(probs[pred_idx])
            info = self.metadata["skin_classes"].get(condition_id, {})
            all_classes = SKIN_CLASSES
        else:
            probs = F.softmax(eye_logits, dim=1)[0].cpu().numpy()
            pred_idx = int(np.argmax(probs))
            condition_id = EYE_CLASSES[pred_idx]
            confidence = float(probs[pred_idx])
            info = self.metadata["eye_classes"].get(condition_id, {})
            all_classes = EYE_CLASSES

        # Format top probabilities
        top_predictions = []
        for idx, prob in enumerate(probs):
            cls_name = all_classes[idx]
            top_predictions.append({
                "class_id": cls_name,
                "label": info.get("name", cls_name) if cls_name == condition_id else cls_name.replace("_", " ").title(),
                "probability": round(float(prob) * 100, 1)
            })
        top_predictions.sort(key=lambda x: x["probability"], reverse=True)

        return {
            "status": "success",
            "is_newborn_valid": True,
            "modality": modality,
            "condition_id": condition_id,
            "condition_name": info.get("name", condition_id),
            "confidence": round(confidence * 100, 1),
            "severity": info.get("severity", "SAFE"),
            "danger_sign_triggered": info.get("danger_sign", False),
            "clinical_explanation": info.get("clinical_explanation", ""),
            "mother_guidance": info.get("mother_guidance", ""),
            "translations": {
                "luganda": info.get("luganda", ""),
                "swahili": info.get("swahili", "")
            },
            "top_predictions": top_predictions[:3],
            "model_version": self.metadata.get("version", "1.0.0")
        }

if __name__ == "__main__":
    predictor = BabyHealthPredictor()
    # Test on a generated skin sample
    from train import generate_skin_sample, generate_eye_sample, generate_invalid_sample
    print("Testing Newborn Skin Sample:")
    res_skin = predictor.predict(generate_skin_sample("jaundice_skin"))
    print(json.dumps(res_skin, indent=2))

    print("\nTesting Newborn Eye Sample:")
    res_eye = predictor.predict(generate_eye_sample("ophthalmia_neonatorum"))
    print(json.dumps(res_eye, indent=2))

    print("\nTesting Non-Baby Invalid Sample:")
    res_invalid = predictor.predict(generate_invalid_sample())
    print(json.dumps(res_invalid, indent=2))
