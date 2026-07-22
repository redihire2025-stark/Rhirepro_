import { supabase } from "./supabase";

interface LogAdminActionInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeValue?: unknown;
  afterValue?: unknown;
}

// Best-effort audit trail for the Super Admin "Audit Logs" module — never
// blocks or fails the caller's actual mutation if logging itself fails.
export async function logAdminAction({ action, entityType, entityId, beforeValue, afterValue }: LogAdminActionInput) {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("admin_audit_log").insert({
      actor_id: data.user.id,
      actor_email: data.user.email,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      before_value: beforeValue ?? null,
      after_value: afterValue ?? null,
    });
  } catch {
    // Logging is best-effort only.
  }
}
