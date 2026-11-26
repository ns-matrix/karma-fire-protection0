# GitHub Pages + Supabase Setup

See README.md for the concise checklist. Run `supabase/schema.sql` in Supabase SQL Editor before configuring the browser client.

## Security model
The frontend uses only the Supabase publishable/anon key. RLS policies permit unauthenticated users to insert a lead with explicit consent, while select/update/delete are restricted to a user whose auth UUID is present in `public.admin_users`. Do not expose a Supabase service_role key.

## Admin provisioning
Create an Auth user first, then insert its UUID and email into `public.admin_users` using the SQL Editor. Removing the row revokes CRM access; deleting the Auth user also cascades the allow-list row.

## Verify
1. Submit a test enquiry from the public contact page.
2. Confirm it appears in `public.leads`.
3. Sign in at the admin URL with the allow-listed user.
4. Confirm totals, filters, status updates and CSV export.
5. Sign out and confirm CRM data is no longer accessible.


## Roles and website content management

- `ns077751@gmail.com` is the initial `super_admin` account.
- Super Admin can invite new Admin users through the secured `invite-crm-admin` Edge Function.
- Admin users can manage enquiries, social links, team profiles, product catalogue, and service catalogue.
- Content images are uploaded to the `site-media` Storage bucket. Only authenticated CRM admins can upload, replace, or delete media.
- Public website pages read only active/published content. Admin mutations are protected by RLS.
- Extended visitor analytics are super-admin-only and are recorded only after explicit analytics consent.
- Edge Function source: `supabase/functions/invite-crm-admin/index.ts`.
