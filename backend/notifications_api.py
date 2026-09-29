import base64
import hashlib
import hmac
import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Literal

from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
load_dotenv(dotenv_path=dotenv_path)

from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import Client, create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
JOB_EXPIRY_DAYS = 15

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
  raise RuntimeError("Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY before starting the API.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
app = FastAPI(title="RhirePro Notifications API")

# Enable CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UserType = Literal["jobseeker", "recruiter"]
NotificationType = Literal[
  "application",
  "message",
  "status_change",
  "job_alert",
  "expiry_warning",
  "expired",
  "reposted",
]


class NotificationCreate(BaseModel):
  user_id: str
  user_type: UserType
  title: str = Field(min_length=1, max_length=120)
  message: str = Field(min_length=1, max_length=1000)
  type: NotificationType
  job_id: str | None = None
  related_id: str | None = None
  notification_key: str | None = None


class RepostResponse(BaseModel):
  job_id: str
  status: str
  deadline: str
  notification_created: bool


def require_same_user(user_id: str, x_user_id: str | None) -> None:
  if not x_user_id or x_user_id != user_id:
    raise HTTPException(status_code=403, detail="Not allowed for this user.")


@app.post("/notifications")
def create_notification(payload: NotificationCreate, x_user_id: str | None = Header(default=None)):
  require_same_user(payload.user_id, x_user_id)

  row = {
    "user_id": payload.user_id,
    "user_type": payload.user_type,
    "title": payload.title,
    "message": payload.message,
    "type": payload.type,
    "job_id": payload.job_id,
    "related_id": payload.related_id,
    "notification_key": payload.notification_key,
    "is_read": False,
  }

  query = supabase.table("notifications")
  if payload.notification_key:
    result = query.upsert(row, on_conflict="notification_key").execute()
  else:
    result = query.insert(row).execute()
  return {"notification": result.data[0] if result.data else None}


@app.get("/notifications")
def fetch_notifications(
  user_id: str = Query(...),
  user_type: UserType = Query(...),
  limit: int = Query(20, ge=1, le=100),
  unread_only: bool = Query(False),
  x_user_id: str | None = Header(default=None),
):
  require_same_user(user_id, x_user_id)

  query = (
    supabase.table("notifications")
    .select("*")
    .eq("user_id", user_id)
    .eq("user_type", user_type)
    .order("created_at", desc=True)
    .limit(limit)
  )
  if unread_only:
    query = query.eq("is_read", False)

  notifications = query.execute().data or []
  unread_count = (
    supabase.table("notifications")
    .select("id", count="exact")
    .eq("user_id", user_id)
    .eq("user_type", user_type)
    .eq("is_read", False)
    .execute()
    .count
    or 0
  )
  return {"notifications": notifications, "unread_count": unread_count}


@app.patch("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str, user_id: str = Query(...), x_user_id: str | None = Header(default=None)):
  require_same_user(user_id, x_user_id)

  result = (
    supabase.table("notifications")
    .update({"is_read": True})
    .eq("id", notification_id)
    .eq("user_id", user_id)
    .execute()
  )
  return {"notification": result.data[0] if result.data else None}


@app.post("/jobs/{job_id}/repost", response_model=RepostResponse)
def repost_job(job_id: str, recruiter_id: str = Query(...), x_user_id: str | None = Header(default=None)):
  require_same_user(recruiter_id, x_user_id)

  job_result = (
    supabase.table("jobs")
    .select("id,recruiter_id,title,views")
    .eq("id", job_id)
    .eq("recruiter_id", recruiter_id)
    .single()
    .execute()
  )
  job = job_result.data
  if not job:
    raise HTTPException(status_code=404, detail="Job not found.")

  deadline = datetime.now(timezone.utc) + timedelta(days=JOB_EXPIRY_DAYS)
  deadline_iso = deadline.isoformat()
  update_result = (
    supabase.table("jobs")
    .update({"status": "Active", "deadline": deadline_iso, "deadline_time": None})
    .eq("id", job_id)
    .eq("recruiter_id", recruiter_id)
    .execute()
  )
  if not update_result.data:
    raise HTTPException(status_code=500, detail="Unable to repost job.")

  notification_key = f"job:{job_id}:reposted:{int(deadline.timestamp())}"
  notification = {
    "user_id": recruiter_id,
    "user_type": "recruiter",
    "title": "Job Reposted",
    "message": f"Your job '{job['title']}' has been successfully reposted and is active for another {JOB_EXPIRY_DAYS} days.",
    "type": "reposted",
    "job_id": job_id,
    "related_id": job_id,
    "notification_key": notification_key,
    "is_read": False,
  }
  notification_result = (
    supabase.table("notifications")
    .upsert(notification, on_conflict="notification_key")
    .execute()
  )

  return RepostResponse(
    job_id=job_id,
    status="Active",
    deadline=deadline_iso,
    notification_created=bool(notification_result.data),
  )


from elasticsearch_client import get_elasticsearch_client

@app.get("/health/elasticsearch")
def check_elasticsearch_health():
  es = get_elasticsearch_client()
  try:
    if es.ping():
      info = es.info()
      return {
        "status": "connected",
        "version": info.get("version", {}).get("number"),
        "cluster_name": info.get("cluster_name")
      }
    else:
      raise HTTPException(status_code=503, detail="Elasticsearch service is not responding to ping.")
  except Exception as e:
    raise HTTPException(
      status_code=500,
      detail=f"Failed to connect to Elasticsearch: {str(e)}"
    )

def is_boolean_query(q: str) -> bool:
  if not q:
    return False
  upper_q = q.upper()
  operators = [" AND ", " OR ", " NOT ", "(", ")", "*", "?", "\""]
  if any(op in upper_q for op in operators):
    return True
  import re
  if re.search(r'\b[a-zA-Z_]+:', q):
    return True
  return False


def expand_unprefixed_terms(q: str, parsed_fields: list) -> str:
  if not q:
    return q
  import re
  # Matches:
  # 1. Quoted terms: "[^"]+"
  # 2. Prefixed terms: [a-zA-Z0-9_.]+:("[^"]+"|[^\s()]+)
  # 3. Parentheses: [()]
  # 4. Standard terms: [^\s()]+
  pattern = r'("[^"]+"|[a-zA-Z0-9_.]+:("[^"]+"|[^\s()]+)|[()]|[^\s()]+)'
  tokens = []
  for match in re.finditer(pattern, q):
    tokens.append(match.group(0))
    
  operators = {"AND", "OR", "NOT", "(", ")"}
  processed_tokens = []
  
  for token in tokens:
    if token in operators:
      processed_tokens.append(token)
    elif ":" in token and not token.startswith('"'):
      processed_tokens.append(token)
    else:
      # Expand unprefixed term
      clauses = []
      for field, weight in parsed_fields:
        if weight:
          clauses.append(f"{field}:{token}^{weight}")
        else:
          clauses.append(f"{field}:{token}")
      expanded = "(" + " OR ".join(clauses) + ")"
      processed_tokens.append(expanded)
      
  return " ".join(processed_tokens)


def preprocess_jobs_query(q: str) -> str:
  if not q:
    return q
  import re
  q_processed = q
  # Replace 'and' and '&' with 'AND'
  q_processed = re.sub(r'\b(and|&)\b', 'AND', q_processed, flags=re.IGNORECASE)
  q_processed = re.sub(r'\s*&\s*', ' AND ', q_processed)
  # Replace 'or' and ',' with 'OR'
  q_processed = re.sub(r'\b(or)\b', 'OR', q_processed, flags=re.IGNORECASE)
  q_processed = re.sub(r'\s*,\s*', ' OR ', q_processed)

  # Map field aliases case-insensitively
  q_processed = re.sub(r'\b(company|company_name):', 'company_name:', q_processed, flags=re.IGNORECASE)
  q_processed = re.sub(r'\b(skill|skills):', 'skills:', q_processed, flags=re.IGNORECASE)
  q_processed = re.sub(r'\b(job_title|title):', 'title:', q_processed, flags=re.IGNORECASE)
  q_processed = re.sub(r'\b(city|location):', 'location:', q_processed, flags=re.IGNORECASE)
  q_processed = re.sub(r'\b(work_mode|mode):', 'work_mode:', q_processed, flags=re.IGNORECASE)
  q_processed = re.sub(r'\b(employment_type|type):', 'employment_type:', q_processed, flags=re.IGNORECASE)
  q_processed = re.sub(r'\b(department|role):', 'department:', q_processed, flags=re.IGNORECASE)

  # Parse fields and weights for expansion
  job_fields = [
    ("title", "4"),
    ("skills", "3"),
    ("company_name", "2"),
    ("location", None),
    ("description", None)
  ]
  return expand_unprefixed_terms(q_processed, job_fields)


def preprocess_candidates_query(q: str) -> str:
  if not q:
    return q
  import re
  q_processed = q
  # Replace 'and' and '&' with 'AND'
  q_processed = re.sub(r'\b(and|&)\b', 'AND', q_processed, flags=re.IGNORECASE)
  q_processed = re.sub(r'\s*&\s*', ' AND ', q_processed)
  # Replace 'or' and ',' with 'OR'
  q_processed = re.sub(r'\b(or)\b', 'OR', q_processed, flags=re.IGNORECASE)
  q_processed = re.sub(r'\s*,\s*', ' OR ', q_processed)

  # Map field aliases case-insensitively
  q_processed = re.sub(r'\b(company|company_name|current_company):', 'current_company:', q_processed, flags=re.IGNORECASE)
  q_processed = re.sub(r'\b(job_title|title|current_title|headline):', 'current_title:', q_processed, flags=re.IGNORECASE)
  q_processed = re.sub(r'\b(skill|skills):', 'skills:', q_processed, flags=re.IGNORECASE)
  q_processed = re.sub(r'\b(city|location):', 'location:', q_processed, flags=re.IGNORECASE)
  q_processed = re.sub(r'\b(pref_location|desired_location|preferred_location):', 'preferred_location:', q_processed, flags=re.IGNORECASE)
  q_processed = re.sub(r'\b(desired_job_title|pref_title):', 'desired_job_title:', q_processed, flags=re.IGNORECASE)
  q_processed = re.sub(r'\b(experience|exp|total_experience):', 'total_experience:', q_processed, flags=re.IGNORECASE)
  q_processed = re.sub(r'\b(experience_val|exp_val|total_experience_val):', 'total_experience_val:', q_processed, flags=re.IGNORECASE)

  # Map name: -> (first_name OR last_name):
  def map_name_field(match):
    val = match.group(1)
    return f"(first_name:{val} OR last_name:{val})"
  
  q_processed = re.sub(r'\bname:("[^"]+"|[^\s()]+)', map_name_field, q_processed, flags=re.IGNORECASE)

  # Parse fields and weights for expansion
  candidate_fields = [
    ("skills", "4"),
    ("current_title", "3"),
    ("first_name", "2"),
    ("last_name", "2"),
    ("current_company", "2"),
    ("about", None),
    ("location", None)
  ]
  return expand_unprefixed_terms(q_processed, candidate_fields)



@app.get("/jobs/search")
def search_jobs(
  q: str = Query(None),
  work_mode: str = Query(None),
  employment_type: str = Query(None),
  location: str = Query(None),
  category: str = Query(None),
  salary_min: str = Query(None),
  salary_max: str = Query(None),
  experience_min: str = Query(None),
  experience_max: str = Query(None),
  sort: str = Query("relevant"),
  page: int = Query(1, ge=1),
  size: int = Query(12, ge=1, le=100)
):
  # Parse numeric params — frontend may send empty strings
  def _float(v):
    try: return float(v) if v and v.strip() else None
    except (ValueError, TypeError): return None
  def _int(v):
    try: return int(v) if v and v.strip() else None
    except (ValueError, TypeError): return None
  salary_min_val = _float(salary_min)
  salary_max_val = _float(salary_max)
  experience_min_val = _int(experience_min)
  experience_max_val = _int(experience_max)

  # Check if we can parse values from q
  salary_min_parsed = None
  salary_max_parsed = None
  experience_min_parsed = None
  experience_max_parsed = None

  if q:
    import re
    # 1. Experience range parsing
    # Match patterns like: "4-7 years", "4 to 7 years", "4-7 yrs", "4-7 years experience", "4-7 yrs exp"
    exp_range_match = re.search(r'\b(\d+)\s*(?:-|to)\s*(\d+)\s*(?:years?|yrs?)(?:\s*exp(?:erience)?)?\b', q, re.IGNORECASE)
    if exp_range_match:
      experience_min_parsed = int(exp_range_match.group(1))
      experience_max_parsed = int(exp_range_match.group(2))
      q = q.replace(exp_range_match.group(0), "").strip()
    else:
      # Match patterns like: "5+ years", "5+ yrs", "5+ years experience"
      exp_plus_match = re.search(r'\b(\d+)\s*\+\s*(?:years?|yrs?)(?:\s*exp(?:erience)?)?\b', q, re.IGNORECASE)
      if exp_plus_match:
        experience_min_parsed = int(exp_plus_match.group(1))
        q = q.replace(exp_plus_match.group(0), "").strip()

    # 2. Salary range parsing
    # Match patterns like: "4-7 LPA", "10 to 15 LPA", "2.5-4.5 lpa", "4 - 7lpa", "4-7lpa"
    sal_range_match = re.search(r'\b(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:LPA|lpa)\b', q, re.IGNORECASE)
    if sal_range_match:
      salary_min_parsed = float(sal_range_match.group(1))
      salary_max_parsed = float(sal_range_match.group(2))
      q = q.replace(sal_range_match.group(0), "").strip()
    else:
      # Match patterns like: "25+ LPA", "15+ lpa", "25+lpa"
      sal_plus_match = re.search(r'\b(\d+(?:\.\d+)?)\s*\+\s*(?:LPA|lpa)\b', q, re.IGNORECASE)
      if sal_plus_match:
        salary_min_parsed = float(sal_plus_match.group(1))
        q = q.replace(sal_plus_match.group(0), "").strip()
      else:
        # Match single salary: "6 LPA", "6lpa"
        sal_single_match = re.search(r'\b(\d+(?:\.\d+)?)\s*(?:LPA|lpa)\b', q, re.IGNORECASE)
        if sal_single_match:
          salary_min_parsed = float(sal_single_match.group(1))
          salary_max_parsed = float(sal_single_match.group(1))
          q = q.replace(sal_single_match.group(0), "").strip()

  # Apply parsed values as fallbacks
  if salary_min_val is None:
    salary_min_val = salary_min_parsed
  if salary_max_val is None:
    salary_max_val = salary_max_parsed
  if experience_min_val is None:
    experience_min_val = experience_min_parsed
  if experience_max_val is None:
    experience_max_val = experience_max_parsed

  es = get_elasticsearch_client()
  try:
    must_queries = []
    filter_queries = [{"term": {"status": "Active"}}]
    
    if q and q.strip():
      q_processed = preprocess_jobs_query(q)

      if is_boolean_query(q_processed):
        must_queries.append({
          "query_string": {
            "query": q_processed,
            "fields": ["title^4", "skills^3", "company_name^2", "location", "description"],
            "default_operator": "OR",
            "fuzziness": "AUTO",
            "lenient": True
          }
        })
      else:
        must_queries.append({
          "multi_match": {
            "query": q,
            "fields": ["title^4", "skills^3", "company_name^2", "location", "description"],
            "type": "cross_fields",
            "operator": "and"
          }
        })
    
    if location and location.strip():
      must_queries.append({
        "match": {
          "location": {
            "query": location,
            "fuzziness": "AUTO"
          }
        }
      })
      
    if work_mode:
      if work_mode in ["Work from Home", "Remote"]:
        filter_queries.append({"terms": {"work_mode": ["Remote", "Work from Home"]}})
      elif work_mode in ["Work from Office", "On-site"]:
        filter_queries.append({"terms": {"work_mode": ["On-site", "Work from Office"]}})
      else:
        filter_queries.append({"term": {"work_mode": work_mode}})
    if employment_type:
      filter_queries.append({"term": {"employment_type": employment_type}})
    if category and category != "ALL":
      filter_queries.append({"term": {"category.keyword": category}})
      
    if salary_min_val is not None or salary_max_val is not None:
      lpa_range = {}
      inr_range = {}
      
      # Determine if the values are raw INR or LPA
      is_raw_inr = False
      if salary_min_val is not None and salary_min_val >= 1000:
        is_raw_inr = True
      if salary_max_val is not None and salary_max_val >= 1000:
        is_raw_inr = True
        
      if is_raw_inr:
        if salary_min_val is not None:
          lpa_range["gte"] = salary_min_val / 100000.0
          inr_range["gte"] = salary_min_val
        if salary_max_val is not None:
          lpa_range["lte"] = salary_max_val / 100000.0
          inr_range["lte"] = salary_max_val
      else:
        if salary_min_val is not None:
          lpa_range["gte"] = salary_min_val
          inr_range["gte"] = salary_min_val * 100000.0
        if salary_max_val is not None:
          lpa_range["lte"] = salary_max_val
          inr_range["lte"] = salary_max_val * 100000.0
          
      filter_queries.append({
        "bool": {
          "should": [
            {"range": {"salary_max": lpa_range}},
            {"range": {"salary_max": inr_range}}
          ],
          "minimum_should_match": 1
        }
      })
      
    if experience_min_val is not None or experience_max_val is not None:
      exp_range = {}
      if experience_min_val is not None:
        exp_range["gte"] = experience_min_val
      if experience_max_val is not None:
        exp_range["lte"] = experience_max_val
      filter_queries.append({"range": {"experience_min": exp_range}})

    sort_config = []
    if sort == "recent":
      sort_config.append({"created_at": {"order": "desc"}})
    elif sort == "salary_asc":
      sort_config.append({"salary_min": {"order": "asc"}})
    elif sort == "salary_desc":
      sort_config.append({"salary_max": {"order": "desc"}})
    elif sort == "relevant":
      sort_config.append("_score")
      
    query = {
      "query": {
        "bool": {
          "must": must_queries if must_queries else {"match_all": {}},
          "filter": filter_queries
        }
      },
      "sort": sort_config,
      "from": (page - 1) * size,
      "size": size
    }
    
    try:
      res = es.search(index="jobs", body=query)
      if res.get("hits", {}).get("total", {}).get("value", 0) == 0 and q and q.strip():
        fallback_query = {
          "query": {
            "bool": {
              "must": [
                {
                  "multi_match": {
                    "query": q,
                    "fields": ["title^4", "skills^3", "company_name^2", "location", "description"],
                    "operator": "or",
                    "fuzziness": "AUTO"
                  }
                }
              ],
              "filter": filter_queries
            }
          },
          "sort": sort_config,
          "from": (page - 1) * size,
          "size": size
        }
        res = es.search(index="jobs", body=fallback_query)
    except Exception as es_err:
      # If query_string search failed (e.g. syntax error), fall back to multi_match query
      if q and q.strip():
        # Replace the query_string query with multi_match query
        query_match = {
          "multi_match": {
            "query": q,
            "fields": ["title^4", "skills^3", "company_name^2", "location", "description"],
            "fuzziness": "AUTO"
          }
        }
        # Find index of query_string in must_queries and replace it
        for idx, item in enumerate(must_queries):
          if "query_string" in item:
            must_queries[idx] = query_match
            break
        query["query"]["bool"]["must"] = must_queries if must_queries else {"match_all": {}}
        res = es.search(index="jobs", body=query)
      else:
        raise es_err

    hits = res.get("hits", {}).get("hits", [])
    total = res.get("hits", {}).get("total", {}).get("value", 0)
    jobs = [hit["_source"] for hit in hits]
    return {"jobs": jobs, "total": total, "page": page, "size": size}
  except Exception as e:
    raise HTTPException(
      status_code=500,
      detail=f"Elasticsearch search failed: {str(e)}"
    )


SENSITIVE_PROFILE_FIELDS = {
  "otp_code", "otp_expires_at", "password", "password_hash",
  "token", "reset_token"
}

def sanitize_candidate_profile(source: dict) -> dict:
  if not isinstance(source, dict):
    return source
  return {k: v for k, v in source.items() if k not in SENSITIVE_PROFILE_FIELDS}


def parse_total_experience(val) -> int:
  if not val:
    return 0
  try:
    return int(val)
  except ValueError:
    pass
  import re
  s = str(val).lower()
  year_match = re.search(r'(\d+)\s*(?:yr|year)', s)
  if year_match:
    return int(year_match.group(1))
  if 'month' in s and 'year' not in s:
    return 0
  match = re.search(r'\b(\d+)\b', s)
  if match:
    return int(match.group(1))
  return 0


@app.post("/webhooks/supabase")
def handle_supabase_webhook(payload: dict):
  event_type = payload.get("type")
  table = payload.get("table")
  record = payload.get("record")
  old_record = payload.get("old_record")
  
  es = get_elasticsearch_client()
  
  try:
    if table == "jobs":
      if event_type in ("INSERT", "UPDATE"):
        if record and record.get("id"):
          es.index(index="jobs", id=record["id"], document=record)
          return {"status": "success", "action": f"indexed job {record['id']}"}
      elif event_type == "DELETE":
        if old_record and old_record.get("id"):
          try:
            es.delete(index="jobs", id=old_record["id"])
          except Exception:
            pass
          return {"status": "success", "action": f"deleted job {old_record['id']}"}
          
    elif table == "profiles":
      if event_type in ("INSERT", "UPDATE"):
        if record and record.get("id"):
          for field in SENSITIVE_PROFILE_FIELDS:
            record.pop(field, None)
          record["total_experience_val"] = parse_total_experience(record.get("total_experience"))
          es.index(index="candidate_profiles", id=record["id"], document=record)
          return {"status": "success", "action": f"indexed profile {record['id']}"}
      elif event_type == "DELETE":
        if old_record and old_record.get("id"):
          try:
            es.delete(index="candidate_profiles", id=old_record["id"])
          except Exception:
            pass
          return {"status": "success", "action": f"deleted profile {old_record['id']}"}
          
    return {"status": "ignored", "reason": "table or event not handled"}
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Webhook sync failed: {str(e)}")


@app.get("/candidates/search")
def search_candidates(
  q: str = Query(None),
  location: str = Query(None),
  current_company: str = Query(None),
  skills: str = Query(None),
  experience_type: str = Query(None),
  experience_min: str = Query(None),
  experience_max: str = Query(None),
  sort: str = Query("relevant"),
  page: int = Query(1, ge=1),
  size: int = Query(500, ge=1, le=1000)
):
  es = get_elasticsearch_client()
  try:
    must_queries = []
    filter_queries = []
    
    if q and q.strip():
      q_processed = preprocess_candidates_query(q)
      
      if is_boolean_query(q_processed):
        must_queries.append({
          "query_string": {
            "query": q_processed,
            "fields": [
              "skills^4", "headline^3", "current_title^3",
              "first_name^2", "last_name^2", "current_company^2",
              "about", "location"
            ],
            "default_operator": "OR",
            "fuzziness": "AUTO",
            "lenient": True
          }
        })
      else:
        must_queries.append({
          "multi_match": {
            "query": q,
            "fields": [
              "skills^4", "headline^3", "current_title^3",
              "first_name^2", "last_name^2", "current_company^2",
              "about", "location"
            ],
            "type": "cross_fields",
            "operator": "and"
          }
        })
    
    if location and location.strip():
      loc_parts = [l.strip() for l in location.split(",") if l.strip()]
      if len(loc_parts) == 1:
        must_queries.append({
          "match": {
            "location": {
              "query": loc_parts[0],
              "fuzziness": "AUTO"
            }
          }
        })
      elif len(loc_parts) > 1:
        must_queries.append({
          "bool": {
            "should": [
              {"match": {"location": {"query": lp, "fuzziness": "AUTO"}}} for lp in loc_parts
            ],
            "minimum_should_match": 1
          }
        })
      
    if current_company and current_company.strip():
      must_queries.append({
        "match": {
          "current_company": {
            "query": current_company,
            "fuzziness": "AUTO"
          }
        }
      })
      
    if skills and skills.strip():
      skill_list = [s.strip().lower() for s in skills.split(",") if s.strip()]
      for skill in skill_list:
        must_queries.append({
          "match": {
            "skills": {
              "query": skill,
              "fuzziness": "AUTO"
            }
          }
        })
      
    if experience_type:
      exp_clean = experience_type.strip().lower()
      filter_queries.append({
        "terms": {
          "experience_type": [exp_clean, exp_clean.capitalize(), experience_type.strip()]
        }
      })
      
    def _int_c(v):
      try: return int(v) if v and v.strip() else None
      except (ValueError, TypeError): return None
    exp_min_val = _int_c(experience_min)
    exp_max_val = _int_c(experience_max)
    if exp_min_val is not None or exp_max_val is not None:
      exp_range = {}
      if exp_min_val is not None:
        exp_range["gte"] = exp_min_val
      if exp_max_val is not None:
        exp_range["lte"] = exp_max_val
      filter_queries.append({"range": {"total_experience_val": exp_range}})

    sort_config = []
    if sort == "recent":
      sort_config.append({"created_at": {"order": "desc"}})
    elif sort == "exp_desc":
      sort_config.append({"total_experience_val": {"order": "desc"}})
    elif sort == "exp_asc":
      sort_config.append({"total_experience_val": {"order": "asc"}})
    elif sort == "relevant":
      sort_config.append("_score")
      
    query = {
      "query": {
        "bool": {
          "must": must_queries if must_queries else {"match_all": {}},
          "filter": filter_queries
        }
      },
      "sort": sort_config,
      "from": (page - 1) * size,
      "size": size
    }
    try:
      res = es.search(index="candidate_profiles", body=query)
      if res.get("hits", {}).get("total", {}).get("value", 0) == 0 and q and q.strip():
        fallback_query = {
          "query": {
            "bool": {
              "must": [
                {
                  "multi_match": {
                    "query": q,
                    "fields": [
                      "skills^4", "headline^3", "current_title^3",
                      "first_name^2", "last_name^2", "current_company^2",
                      "about", "location"
                    ],
                    "operator": "or",
                    "fuzziness": "AUTO"
                  }
                }
              ],
              "filter": filter_queries
            }
          },
          "sort": sort_config,
          "from": (page - 1) * size,
          "size": size
        }
        res = es.search(index="candidate_profiles", body=fallback_query)
    except Exception as es_err:
      # If query_string search failed (e.g. syntax error), fall back to multi_match query
      if q and q.strip():
        query_match = {
          "multi_match": {
            "query": q,
            "fields": [
              "skills^4", "headline^3", "current_title^3",
              "first_name^2", "last_name^2", "current_company^2",
              "about", "location"
            ],
            "fuzziness": "AUTO"
          }
        }
        for idx, item in enumerate(must_queries):
          if "query_string" in item:
            must_queries[idx] = query_match
            break
        query["query"]["bool"]["must"] = must_queries if must_queries else {"match_all": {}}
        res = es.search(index="candidate_profiles", body=query)
      else:
        raise es_err

    hits = res.get("hits", {}).get("hits", [])
    total = res.get("hits", {}).get("total", {}).get("value", 0)
    candidates = [sanitize_candidate_profile(hit["_source"]) for hit in hits]
    return {"candidates": candidates, "total": total, "page": page, "size": size}
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Candidate search query failed: {str(e)}")


@app.get("/jobs/autocomplete")
def jobs_autocomplete(q: str = Query(...)):
  es = get_elasticsearch_client()
  try:
    if not q or not q.strip():
      return {"suggestions": []}
    
    query = {
      "query": {
        "match_phrase_prefix": {
          "title": {
            "query": q
          }
        }
      },
      "size": 8
    }
    res = es.search(index="jobs", body=query)
    hits = res.get("hits", {}).get("hits", [])
    suggestions = list(set([hit["_source"].get("title") for hit in hits if hit["_source"].get("title")]))
    return {"suggestions": suggestions}
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Autocomplete suggestions query failed: {str(e)}")


@app.get("/services")
def get_services():
  return [
    {
      "id": "talent-sourcing",
      "page": "/services/talent-sourcing",
      "title": "Talent Sourcing",
      "description": "Connect with top talent across industries to find the perfect candidates for your organization and build high-performing teams.",
      "icon": "Users",
      "image": "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=500&q=80"
    },
    {
      "id": "executive-search",
      "page": "/services/executive-search",
      "title": "Executive Search",
      "description": "Specialized recruitment for senior leadership positions that drive your company forward with strategic vision and expertise.",
      "icon": "Award",
      "image": "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=500&q=80"
    },
    {
      "id": "job-matching",
      "page": "/services/job-matching",
      "title": "Job Matching",
      "description": "AI-powered algorithms match candidates with opportunities based on skills, experience, culture fit, and career goals.",
      "icon": "Briefcase",
      "image": "https://images.unsplash.com/photo-1551434678-e076c223a692?w=500&q=80"
    },
    {
      "id": "employer-branding",
      "page": "/services/branding-support",
      "title": "Employer Branding",
      "description": "Build and promote your employer brand to attract the best talent in your industry and stand out from competitors.",
      "icon": "TrendingUp",
      "image": "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=500&q=80"
    },
    {
      "id": "career-coaching",
      "page": "/services/career-coaching",
      "title": "Career Coaching & Resume Review",
      "description": "Expert guidance to help candidates present themselves effectively and maximize their career potential.",
      "icon": "CheckCircle2",
      "image": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80"
    },
    {
      "id": "contract-hiring",
      "page": "/services/project-based-hiring",
      "title": "Contract & Project-Based Hiring",
      "description": "Flexible hiring solutions for temporary and project-based needs with vetted professionals ready to contribute.",
      "icon": "Clock",
      "image": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=500&q=80"
    }
  ]


@app.get("/plans")
def get_plans():
  return [
    {
      "id": "basic",
      "name": "Basic Plan",
      "price": 350,
      "period": "month",
      "dailyJobPosts": 10,
      "features": [
        "10 daily job posts",
        "Basic Analytics",
        "Email Support",
        "1 Team Member"
      ],
      "popular": False
    },
    {
      "id": "standard",
      "name": "Standard Plan",
      "price": 1000,
      "period": "month",
      "dailyJobPosts": 50,
      "features": [
        "50 daily job posts",
        "100+ job templates",
        "Advanced Analytics",
        "Priority Support",
        "5 Team Members"
      ],
      "popular": True
    },
    {
      "id": "premium",
      "name": "Premium Plan",
      "price": 3000,
      "period": "month",
      "dailyJobPosts": None,
      "features": [
        "Unlimited job posts",
        "Advanced hiring tools",
        "Dedicated Account Manager",
        "24/7 Premium Support",
        "Unlimited Team Members"
      ],
      "popular": False
    }
  ]


@app.get("/testimonials")
def get_testimonials():
  try:
    result = supabase.table("feedback").select("id,user_id,user_type,user_email,rating,comment").order("created_at", desc=True).limit(5).execute()
    feedbacks = result.data or []
    if not feedbacks:
      return [
        {
          "name": "Sarah Johnson",
          "role": "Software Engineer",
          "rating": 5,
          "comment": "RhirePro helped me land my dream job in just 2 weeks. The process was seamless and the support team was incredible!"
        }
      ]
    parsed = []
    for f in feedbacks:
      email = f.get("user_email") or ""
      name = email.split("@")[0].title() if email else "RhirePro User"
      parsed.append({
        "name": name,
        "role": "Recruiter" if f.get("user_type") == "recruiter" else "Job Seeker",
        "rating": f.get("rating") or 5,
        "comment": f.get("comment") or "Great experience with RhirePro!"
      })
    return parsed
  except Exception:
    return [
      {
        "name": "Sarah Johnson",
        "role": "Software Engineer",
        "rating": 5,
        "comment": "RhirePro helped me land my dream job in just 2 weeks. The process was seamless and the support team was incredible!"
      }
    ]


# ── Razorpay Payment Gateway Integration ────────────────────────────────────────

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID") or "rzp_test_TOksXioBHbSu5W"
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET") or "frVS9mmWMomFbj8nJUW2t9zX"

PLANS_DB = {
  "basic": {"id": "basic", "name": "Basic Plan", "price": 350, "dailyJobPosts": 10},
  "standard": {"id": "standard", "name": "Standard Plan", "price": 1000, "dailyJobPosts": 50},
  "premium": {"id": "premium", "name": "Premium Plan", "price": 3000, "dailyJobPosts": None},
}

PROMO_CODES_DB = {
  "RHIRE10": {"discountType": "percentage", "discountValue": 10},
  "RHIRE20": {"discountType": "percentage", "discountValue": 20},
  "HIRE50":  {"discountType": "percentage", "discountValue": 50},
  "NEWJOIN": {"discountType": "fixed",      "discountValue": 100},
  "RHIRE99": {"discountType": "set_price",  "discountValue": 1},
}


def calculate_plan_price(plan_id: str, promo_code: str | None = None):
  plan = PLANS_DB.get(plan_id.lower())
  if not plan:
    raise HTTPException(status_code=400, detail=f"Invalid plan ID: {plan_id}")

  base_price = plan["price"]
  gst_rate = 0.18
  discount_amount = 0
  is_set_price = False

  if promo_code and promo_code.strip():
    code = promo_code.strip().upper()
    promo = PROMO_CODES_DB.get(code)
    if promo:
      dtype = promo["discountType"]
      dval = promo["discountValue"]
      if dtype == "percentage":
        discounted_base = round(base_price * (1 - dval / 100))
      elif dtype == "set_price":
        discounted_base = dval
        is_set_price = True
      else:
        discounted_base = max(1, base_price - dval)
      discount_amount = base_price - discounted_base
    else:
      discounted_base = base_price
  else:
    discounted_base = base_price

  gst_amount = 0 if is_set_price else round(base_price * gst_rate)
  total_amount = discounted_base + gst_amount
  return {
    "base_price": base_price,
    "discount_amount": discount_amount,
    "gst_amount": gst_amount,
    "total_amount": total_amount,
    "daily_job_posts": plan["dailyJobPosts"],
    "plan_name": plan["name"],
  }


class CreateOrderPayload(BaseModel):
  plan_id: str
  recruiter_id: str
  promo_code: str | None = None


class VerifyPaymentPayload(BaseModel):
  razorpay_order_id: str
  razorpay_payment_id: str
  razorpay_signature: str
  recruiter_id: str
  plan_id: str
  promo_code: str | None = None


def activate_recruiter_plan(recruiter_id: str, plan_id: str, order_id: str, payment_id: str):
  now = datetime.now(timezone.utc)
  expires_at = now + timedelta(days=30)
  plan_info = PLANS_DB.get(plan_id.lower())
  daily_posts = plan_info["dailyJobPosts"] if plan_info else None
  plan_name = plan_info["name"] if plan_info else plan_id

  # 1. Find existing transaction for order_id or payment_id
  txn_data = (
    supabase.table("payment_transactions")
    .select("id")
    .or_(f"transaction_ref.eq.{order_id},transaction_ref.eq.{payment_id}")
    .execute()
    .data
  )

  txn_id = None
  if txn_data:
    txn_id = txn_data[0]["id"]
    supabase.table("payment_transactions").update({
      "status": "success",
      "payment_method": "razorpay",
      "transaction_ref": payment_id,
      "completed_at": now.isoformat(),
    }).eq("id", txn_id).execute()
  else:
    # Insert new success transaction
    new_txn = supabase.table("payment_transactions").insert({
      "recruiter_id": recruiter_id,
      "plan_id": plan_id,
      "amount": plan_info["price"] if plan_info else 0,
      "final_amount": plan_info["price"] if plan_info else 0,
      "status": "success",
      "payment_method": "razorpay",
      "transaction_ref": payment_id,
      "completed_at": now.isoformat(),
    }).execute()
    if new_txn.data:
      txn_id = new_txn.data[0]["id"]

  # 2. Cancel existing active subscriptions
  supabase.table("recruiter_subscriptions").update({
    "status": "cancelled",
  }).eq("recruiter_id", recruiter_id).eq("status", "active").execute()

  # 3. Create new active subscription
  sub_row = {
    "recruiter_id": recruiter_id,
    "plan_id": plan_id,
    "status": "active",
    "started_at": now.isoformat(),
    "expires_at": expires_at.isoformat(),
    "daily_job_posts": daily_posts,
    "payment_id": txn_id,
  }
  supabase.table("recruiter_subscriptions").insert(sub_row).execute()

  # 4. Upgrade recruiter profile to org admin
  supabase.table("recruiter_profiles").update({
    "org_role": "admin",
    "max_seats": 10,
    "is_org_admin": True,
  }).eq("id", recruiter_id).execute()

  # 5. Create in-app notification
  try:
    supabase.table("notifications").insert({
      "user_id": recruiter_id,
      "user_type": "recruiter",
      "title": "Subscription Activated!",
      "message": f"Your {plan_name} subscription has been activated successfully.",
      "type": "status_change",
      "is_read": False,
    }).execute()
  except Exception as e:
    print("Notification error:", e)


@app.post("/payments/create-order")
def create_razorpay_order(payload: CreateOrderPayload):
  price_info = calculate_plan_price(payload.plan_id, payload.promo_code)
  amount_in_paise = max(100, price_info["total_amount"] * 100)  # min ₹1

  url = "https://api.razorpay.com/v1/orders"
  order_payload = json.dumps({
    "amount": amount_in_paise,
    "currency": "INR",
    "receipt": f"rcpt_{payload.recruiter_id[:8]}_{int(datetime.now(timezone.utc).timestamp())}",
    "notes": {
      "recruiter_id": payload.recruiter_id,
      "plan_id": payload.plan_id,
      "promo_code": payload.promo_code or "",
    },
  }).encode("utf-8")

  auth_str = base64.b64encode(f"{RAZORPAY_KEY_ID}:{RAZORPAY_KEY_SECRET}".encode("utf-8")).decode("utf-8")

  req = urllib.request.Request(
    url,
    data=order_payload,
    headers={
      "Content-Type": "application/json",
      "Authorization": f"Basic {auth_str}",
    },
    method="POST",
  )

  try:
    with urllib.request.urlopen(req) as resp:
      order_resp = json.loads(resp.read().decode("utf-8"))
  except urllib.error.HTTPError as err:
    err_body = err.read().decode("utf-8")
    print("Razorpay HTTPError:", err_body)
    raise HTTPException(status_code=500, detail=f"Razorpay order creation failed: {err_body}")
  except Exception as err:
    print("Razorpay order exception:", err)
    raise HTTPException(status_code=500, detail=f"Failed to create Razorpay order: {str(err)}")

  order_id = order_resp["id"]

  # Record pending transaction in Supabase
  try:
    supabase.table("payment_transactions").insert({
      "recruiter_id": payload.recruiter_id,
      "plan_id": payload.plan_id,
      "amount": price_info["base_price"],
      "promo_code": payload.promo_code or None,
      "discount_amount": price_info["discount_amount"],
      "final_amount": price_info["total_amount"],
      "status": "pending",
      "payment_method": "razorpay",
      "transaction_ref": order_id,
    }).execute()
  except Exception as e:
    print("Pending txn record warning:", e)

  return {
    "order_id": order_id,
    "amount": amount_in_paise,
    "currency": "INR",
    "key_id": RAZORPAY_KEY_ID,
    "plan_id": payload.plan_id,
    "final_amount": price_info["total_amount"],
    "discount_amount": price_info["discount_amount"],
    "base_price": price_info["base_price"],
    "gst_amount": price_info["gst_amount"],
  }


@app.post("/payments/verify-payment")
def verify_razorpay_payment(payload: VerifyPaymentPayload):
  msg = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}"
  generated_signature = hmac.new(
    RAZORPAY_KEY_SECRET.encode("utf-8"),
    msg.encode("utf-8"),
    hashlib.sha256,
  ).hexdigest()

  if generated_signature != payload.razorpay_signature:
    raise HTTPException(status_code=400, detail="Invalid Razorpay signature.")

  activate_recruiter_plan(
    recruiter_id=payload.recruiter_id,
    plan_id=payload.plan_id,
    order_id=payload.razorpay_order_id,
    payment_id=payload.razorpay_payment_id,
  )

  return {
    "success": True,
    "message": "Payment verified and plan activated successfully.",
    "transaction_ref": payload.razorpay_payment_id,
  }


@app.post("/payments/webhook")
async def razorpay_webhook(request: Request):
  body = await request.body()
  signature = request.headers.get("X-Razorpay-Signature", "")

  expected_sig = hmac.new(
    RAZORPAY_KEY_SECRET.encode("utf-8"),
    body,
    hashlib.sha256,
  ).hexdigest()

  if signature and signature != expected_sig:
    raise HTTPException(status_code=400, detail="Invalid webhook signature")

  try:
    payload = json.loads(body.decode("utf-8"))
    event = payload.get("event")
    contains = payload.get("payload", {})

    if event in ("payment.captured", "order.paid"):
      payment_entity = contains.get("payment", {}).get("entity", {})
      order_id = payment_entity.get("order_id")
      payment_id = payment_entity.get("id")
      notes = payment_entity.get("notes", {})
      recruiter_id = notes.get("recruiter_id")
      plan_id = notes.get("plan_id")

      if recruiter_id and plan_id:
        activate_recruiter_plan(recruiter_id, plan_id, order_id, payment_id)

    elif event == "payment.failed":
      payment_entity = contains.get("payment", {}).get("entity", {})
      order_id = payment_entity.get("order_id")
      if order_id:
        supabase.table("payment_transactions").update({
          "status": "failed",
        }).eq("transaction_ref", order_id).execute()

  except Exception as e:
    print("Webhook processing error:", e)

  return {"status": "ok"}

