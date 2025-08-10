import os
import sys

WEAVIATE_URL = "https://aifxammt6bny96hrbhbw.c0.europe-west3.gcp.weaviate.cloud"
COLLECTION_NAME = "Questions_answers"

try:
    import weaviate
    from weaviate.auth import AuthApiKey
except ImportError:
    print("weaviate-client is not installed. Please run: python -m pip install weaviate-client", file=sys.stderr)
    sys.exit(1)

api_key = os.getenv("WEAVIATE_API_KEY")
if not api_key:
    print("Environment variable WEAVIATE_API_KEY is not set.", file=sys.stderr)
    sys.exit(2)

client = weaviate.connect_to_weaviate_cloud(
    cluster_url=WEAVIATE_URL,
    auth_credentials=AuthApiKey(api_key),
)

with client:
    try:
        client.collections.delete(COLLECTION_NAME)
        print(f"Коллекция '{COLLECTION_NAME}' удалена")
    except Exception as e:
        print(f"Не удалось удалить коллекцию '{COLLECTION_NAME}': {e}")

