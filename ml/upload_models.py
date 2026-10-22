
import os
import boto3
from pathlib import Path
from botocore.config import Config

MODELS_DIR = Path(__file__).parent / "models"

account_id = os.environ["R2_ACCOUNT_ID"]
access_key = os.environ["R2_ACCESS_KEY_ID"]
secret_key = os.environ["R2_SECRET_ACCESS_KEY"]
bucket_name = os.environ.get(
    "R2_BUCKET_NAME", "angkringan-ml-models"
)

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name="auto",
    config=Config(signature_version="s3v4")
)

model_files = list(MODELS_DIR.glob("*.pkl"))

if not model_files:
    raise RuntimeError("Tidak ditemukan file .pkl di folder models")

print(f"Ditemukan {len(model_files)} model.")

for model_file in model_files:
    object_key = f"models/{model_file.name}"

    s3.upload_file(
        str(model_file),
        bucket_name,
        object_key
    )

    print(f"Berhasil upload: {object_key}")

print("Semua model berhasil diunggah ke Cloudflare R2.")
