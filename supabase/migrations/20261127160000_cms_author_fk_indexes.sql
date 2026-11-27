-- Add indexes for CMS author foreign keys flagged by Supabase performance advisors.
create index if not exists website_cms_drafts_updated_by_idx
  on public.website_cms_drafts(updated_by)
  where updated_by is not null;

create index if not exists website_cms_versions_published_by_idx
  on public.website_cms_versions(published_by)
  where published_by is not null;
