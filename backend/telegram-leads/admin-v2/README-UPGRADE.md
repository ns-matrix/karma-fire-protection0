# Website Admin Portal

The previous admin-v2 CRM dashboard has been replaced by the ZIP reference Website Admin Portal.

- Login: https://ns-matrix.github.io/karma-fire-protection0/backend/telegram-leads/admin-v2/index.html
- Website: https://ns-matrix.github.io/karma-fire-protection0/
- Repository: https://github.com/ns-matrix/karma-fire-protection0

The active implementation is `index.html`, `assets/zip-portal.css` and `js/zip-admin.js`. The portal authenticates with Supabase email/password and resolves the current role from the database. It manages website services, products, projects, team profiles, reviews, CMS drafts/publishing/version restore, site contact/map settings and social links. Admin/Super Admin roles additionally manage public enquiries and analytics.

Legacy sub-page URLs redirect to the matching tab in the unified portal. Website content is stored in Supabase; demo product, team, project and review records are unpublished until reviewed and activated. Operational enquiries, visitor history and authorised accounts are retained.
