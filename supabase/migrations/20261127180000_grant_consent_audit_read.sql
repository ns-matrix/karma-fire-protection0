-- Allow authenticated sessions to reach the consent table; RLS keeps rows Super Admin-only.
grant select on public.website_consent_records to authenticated;
