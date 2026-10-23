# Build and push this image, then create a RunPod Serverless endpoint from it.
FROM runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Bake the model into the image so cold starts don't download it.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-small-en-v1.5')"
COPY handler.py .
CMD ["python", "-u", "handler.py"]
