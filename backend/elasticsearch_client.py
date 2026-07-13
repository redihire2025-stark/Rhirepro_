import os
from elasticsearch import Elasticsearch

# Default to local container network URL or local machine URL if running outside docker
ELASTICSEARCH_URL = os.environ.get("ELASTICSEARCH_URL", "http://localhost:9200")

# The Elasticsearch client manages a connection pool and is thread-safe.
es_client = Elasticsearch(
    hosts=[ELASTICSEARCH_URL],
)

def get_elasticsearch_client() -> Elasticsearch:
    """
    Returns the reusable, thread-safe Elasticsearch client.
    """
    return es_client
