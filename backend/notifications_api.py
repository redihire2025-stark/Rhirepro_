import os
from dotenv import load_dotenv
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
load_dotenv(dotenv_path=dotenv_path)

from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import FastAPI, Header, HTTPException, Query
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
  size: int = Query(20, ge=1, le=100)
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
      must_queries.append({
        "match": {
          "location": {
            "query": location,
            "fuzziness": "AUTO"
          }
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
      filter_queries.append({"term": {"experience_type": experience_type}})
      
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
    candidates = [hit["_source"] for hit in hits]
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
