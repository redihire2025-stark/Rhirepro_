-- Org admins submitting a ticket were indistinguishable from a regular
-- recruiter team member (requester_type only had 'recruiter'). Add 'admin' so
-- Super Admin can tell them apart in the Support Tickets list.
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_requester_type_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_requester_type_check
  CHECK (requester_type IN ('recruiter', 'admin', 'jobseeker', 'guest', 'other'));
