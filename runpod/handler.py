"""RunPod serverless handler: semantic skill similarity on a GPU.

Nexa's matching is rule-based so every point can be explained. This endpoint
adds one optional signal: how close a person's skills are, in meaning, to each
target role's skills, using the open-source embedding model
BAAI/bge-small-en-v1.5 (MIT licence). The Replit app calls it when
RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID are set and shows the result as
"semantic closeness" next to each role; without it, the app works unchanged.

Input:  {"input": {"profile": ["Customer care", ...], "roles": {"data_analyst": ["Data analysis", ...], ...}}}
Output: {"model": "...", "device": "cuda", "scores": {"data_analyst": 0.71, ...}}
"""

import runpod
import torch
from sentence_transformers import SentenceTransformer

MODEL_ID = "BAAI/bge-small-en-v1.5"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
model = SentenceTransformer(MODEL_ID, device=DEVICE)


def embed(texts: list[str]) -> torch.Tensor:
    return model.encode(texts, convert_to_tensor=True, normalize_embeddings=True)


def handler(job: dict) -> dict:
    data = job.get("input", {})
    profile = [str(text) for text in data.get("profile", []) if str(text).strip()]
    roles = {key: [str(text) for text in value] for key, value in data.get("roles", {}).items() if value}
    if not profile or not roles:
        return {"error": "Send a non-empty 'profile' list and 'roles' mapping."}

    mine = embed(profile)
    scores = {}
    for role_id, skills in roles.items():
        theirs = embed(skills)
        # For each skill the role needs, how close is the person's nearest skill?
        best = (theirs @ mine.T).max(dim=1).values
        scores[role_id] = round(float(best.mean()), 4)
    return {"model": MODEL_ID, "device": DEVICE, "scores": scores}


runpod.serverless.start({"handler": handler})
