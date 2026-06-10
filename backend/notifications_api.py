import os
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import FastAPI, Header, HTTPException, Query
from pydantic import BaseModel, Field
from supabase import Client, create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
JOB_EXPIRY_DAYS = 15

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
app = FastAPI(title="RhirePro Notifications API")

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
