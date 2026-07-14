import os
from dotenv import load_dotenv
from supabase import create_client, Client
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
from elasticsearch_client import get_elasticsearch_client

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
load_dotenv(dotenv_path=dotenv_path)

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Ensure SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.")

# Initialize clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
es: Elasticsearch = get_elasticsearch_client()

# 1. Settings & Analyzer Configuration
SETTINGS = {
    "analysis": {
        "filter": {
            "english_stop": {
                "type": "stop",
                "stopwords": "_english_"
            },
            "english_stemmer": {
                "type": "stemmer",
                "language": "english"
            },
            "synonym_filter": {
                "type": "synonym",
                "synonyms": [
                    "javascript, js, ecmascript",
                    "typescript, ts",
                    "react, reactjs",
                    "dotnet, net",
                    "cybersecurity, cyber-security",
                    "sysadmin, system-admin",
                    "ta, talent-acquisition",
                    "ats, applicant-tracking-system",
                    "hris, hr-system",
                    "bangalore, bengaluru, bangolre, bangolore, bengalor",
                    "gurgaon, gurugram",
                    "delhi, ncr",
                    "mumbai, bombay",
                    "kolkata, calcutta",
                    "chennai, madras",
                    "trivandrum, thiruvananthapuram",
                    "hyderabad, hyderbad, secunderabad",
                    "tamilnadu, tamil-nadu",
                    "andhrapradesh, andhra-pradesh",
                    "maharashtra, maharastra",
                    "java, jva",
                    "jest, jst",
                    "jira, jera",
                    "python, pythn",
                    "react, reat",
                    "kubernetes, k8s",
                    "docker, docer",
                    "jenkins, jenkin",
                    "developer, engineer, programmer, coder, specialist",
                    "backend, back-end",
                    "frontend, front-end"
                ]
            }
        },
        "analyzer": {
            "custom_synonym_analyzer": {
                "tokenizer": "standard",
                "filter": [
                    "lowercase",
                    "english_stop",
                    "synonym_filter",
                    "english_stemmer"
                ]
            }
        }
    }
}

JOBS_MAPPING = {
    "settings": SETTINGS,
    "mappings": {
        "properties": {
            "id": { "type": "keyword" },
            "recruiter_id": { "type": "keyword" },
            "title": {
                "type": "text",
                "analyzer": "custom_synonym_analyzer",
                "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } }
            },
            "description": { "type": "text", "analyzer": "custom_synonym_analyzer" },
            "company_name": {
                "type": "text",
                "analyzer": "custom_synonym_analyzer",
                "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } }
            },
            "location": {
                "type": "text",
                "analyzer": "custom_synonym_analyzer",
                "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } }
            },
            "work_mode": { "type": "keyword" },
            "salary_min": { "type": "double" },
            "salary_max": { "type": "double" },
            "salary_type": { "type": "keyword" },
            "experience_min": { "type": "integer" },
            "experience_max": { "type": "integer" },
            "employment_type": { "type": "keyword" },
            "industry": { "type": "keyword" },
            "department": { "type": "keyword" },
            "skills": {
                "type": "text",
                "analyzer": "custom_synonym_analyzer",
                "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } }
            },
            "perks": { "type": "text", "analyzer": "custom_synonym_analyzer" },
            "education": { "type": "text", "analyzer": "custom_synonym_analyzer" },
            "interview_mode": { "type": "keyword" },
            "roles_responsibilities": { "type": "text", "analyzer": "custom_synonym_analyzer" },
            "requirements": { "type": "text", "analyzer": "custom_synonym_analyzer" },
            "openings": { "type": "integer" },
            "status": { "type": "keyword" },
            "views": { "type": "integer" },
            "created_at": { "type": "date" },
            "deadline": { "type": "date" },
            "deadline_time": { "type": "keyword" }
        }
    }
}

PROFILES_MAPPING = {
    "settings": SETTINGS,
    "mappings": {
        "properties": {
            "id": { "type": "keyword" },
            "email": { "type": "keyword" },
            "first_name": {
                "type": "text",
                "analyzer": "custom_synonym_analyzer",
                "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } }
            },
            "last_name": {
                "type": "text",
                "analyzer": "custom_synonym_analyzer",
                "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } }
            },
            "phone": { "type": "keyword" },
            "avatar_url": { "type": "keyword", "index": False },
            "headline": { "type": "text", "analyzer": "custom_synonym_analyzer" },
            "location": {
                "type": "text",
                "analyzer": "custom_synonym_analyzer",
                "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } }
            },
            "experience_type": { "type": "keyword" },
            "total_experience": {
                "type": "text",
                "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } }
            },
            "current_company": {
                "type": "text",
                "analyzer": "custom_synonym_analyzer",
                "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } }
            },
            "current_title": {
                "type": "text",
                "analyzer": "custom_synonym_analyzer",
                "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } }
            },
            "current_salary": { "type": "keyword" },
            "expected_salary": { "type": "keyword" },
            "notice_period": { "type": "keyword" },
            "skills": {
                "type": "text",
                "analyzer": "custom_synonym_analyzer",
                "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } }
            },
            "resume_url": { "type": "keyword", "index": False },
            "linkedin_url": { "type": "keyword", "index": False },
            "portfolio_url": { "type": "keyword", "index": False },
            "about": { "type": "text", "analyzer": "custom_synonym_analyzer" },
            "preferred_interview_mode": { "type": "keyword" },
            "created_at": { "type": "date" },
            "total_experience_val": { "type": "integer" },
            
            # Additional and dynamic fields from migrate script and database seed data
            "dob": { "type": "keyword" },
            "gender": { "type": "keyword" },
            "marital_status": { "type": "keyword" },
            "desired_job_title": {
                "type": "text",
                "analyzer": "custom_synonym_analyzer",
                "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } }
            },
            "job_type_pref": { "type": "keyword" },
            "preferred_location": {
                "type": "text",
                "analyzer": "custom_synonym_analyzer",
                "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } }
            },
            "work_auth": { "type": "keyword" },
            "willing_to_relocate": { "type": "keyword" },
            "languages": {
                "type": "object",
                "properties": {
                    "language": { "type": "keyword" },
                    "proficiency": { "type": "keyword" }
                }
            },
            "profile_views": { "type": "integer" },
            "recruiter_searches": { "type": "integer" }
        }
    }
}

def parse_total_experience(val) -> int:
    if not val:
        return 0
    try:
        return int(val)
    except ValueError:
        pass
    import re
    match = re.search(r'\b(\d+)\b', str(val))
    if match:
        return int(match.group(1))
    return 0

def setup_indices():
    # Create jobs index
    if es.indices.exists(index="jobs"):
        print("Deleting existing index: 'jobs'")
        es.indices.delete(index="jobs")
    es.indices.create(index="jobs", body=JOBS_MAPPING)
    print("Created index: 'jobs'")

    # Create candidate profiles index
    if es.indices.exists(index="candidate_profiles"):
        print("Deleting existing index: 'candidate_profiles'")
        es.indices.delete(index="candidate_profiles")
    es.indices.create(index="candidate_profiles", body=PROFILES_MAPPING)
    print("Created index: 'candidate_profiles'")

def sync_data():
    print("Fetching jobs from Supabase...")
    jobs_response = supabase.table("jobs").select("*").execute()
    jobs = jobs_response.data or []
    print(f"Loaded {len(jobs)} jobs.")

    print("Fetching candidate profiles from Supabase...")
    profiles_response = supabase.table("profiles").select("*").execute()
    profiles = profiles_response.data or []
    print(f"Loaded {len(profiles)} candidate profiles.")

    # Index Jobs
    if jobs:
        actions = [
            {
                "_index": "jobs",
                "_id": job["id"],
                "_source": job
            }
            for job in jobs
        ]
        success, errors = bulk(es, actions)
        print(f"Successfully indexed {success} jobs. Errors: {errors}")

    # Index Profiles
    if profiles:
        for profile in profiles:
            profile["total_experience_val"] = parse_total_experience(profile.get("total_experience"))
        actions = [
            {
                "_index": "candidate_profiles",
                "_id": profile["id"],
                "_source": profile
            }
            for profile in profiles
        ]
        success, errors = bulk(es, actions)
        print(f"Successfully indexed {success} candidate profiles. Errors: {errors}")

if __name__ == "__main__":
    setup_indices()
    sync_data()
    print("Elasticsearch setup and sync complete.")
