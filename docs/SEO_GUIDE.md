# Comprehensive SEO & Google Integration Guide — Karma Fire Protection

This guide outlines the complete Search Engine Optimization architecture and integration procedures for Google Search Console, Google Analytics 4, and Google Business Profile.

---

## 1. On-Page SEO Architecture Audit

Every page in the website has been audited and structured with:
- **Unique Title Tag** under 60 characters with geo-targeted keywords (Mumbai, Thane, Vikhroli).
- **Unique Meta Description** (150–160 characters) providing a clear value proposition and call to action.
- **Canonical URLs** matching the exact production domain (`https://www.karmafireprotection.com/...`).
- **Open Graph & Twitter Cards** for optimized rendering when shared on LinkedIn, WhatsApp, and social media.
- **Heading Hierarchy:** One logical `<h1>` per page, followed by semantic `<h2>` and `<h3>` tags without skipping levels.
- **Image Optimization:** All visual assets use `.webp` format with descriptive `alt` tags and explicit `width`/`height` attributes to prevent Cumulative Layout Shift (CLS).

### Page Metadata Summary

| Page | Canonical URL | Focus Keyword Target | Schema Type |
| :--- | :--- | :--- | :--- |
| `index.html` | `/` | Fire Protection Systems Mumbai | `LocalBusiness`, `FireProtectionService` |
| `about.html` | `/about.html` | Fire Safety Consultant Mumbai | `AboutPage`, `BreadcrumbList` |
| `services.html`| `/services.html`| Fire Hydrant, Alarm, Sprinkler, Suppression | `Service`, `OfferCatalog` |
| `projects.html`| `/projects.html`| Fire Protection Projects & Clients | `CollectionPage`, `BreadcrumbList` |
| `contact.html` | `/contact.html` | Fire Protection Quote & Inspection | `ContactPage`, `LocalBusiness` |
| `privacy-policy.html`| `/privacy-policy.html`| Privacy Policy & Data Practices | `BreadcrumbList` |

---

## 2. Structured Data (Schema.org JSON-LD)

Verified business details are encoded on each page:
- **Legal Name:** Karma Fire Protection LLP
- **Phone:** `+91 95949 67751`
- **Email:** `karmafireprotectionllp@gmail.com`
- **Address:** Police Station, 04, near Surya Nagar, Suryanagar No. 2, Surya Nagar, HMPL Surya Nagar, Vikhroli West, Mumbai, Maharashtra 400083
- **Primary Service Areas:** Mumbai, Navi Mumbai, Thane, Powai, Kandivali, Vasai.
- **Operating Hours:** Monday–Saturday, 09:00 to 19:00.

*Zero fabricated certifications, unverified testimonials, or false addresses are used.*

---

## 3. Google Search Console (GSC) Setup

1. Open [Google Search Console](https://search.google.com/search-console).
2. Choose **Domain** verification or **URL prefix** (`https://www.karmafireprotection.com`).
3. Verification options:
   - **DNS TXT Record:** Add the `google-site-verification=...` TXT record in your domain registrar (e.g., Cloudflare, GoDaddy, Namecheap).
   - **HTML Meta Tag:** Add `<meta name="google-site-verification" content="YOUR_CODE">` to `index.html`.
4. **Submit Sitemap:**
   - Go to **Sitemaps** in the left menu.
   - Enter `sitemap.xml` and click **Submit**.
   - Verify that all 6 URLs are discovered and indexed.

---

## 4. Google Analytics 4 (GA4) Integration

The platform includes built-in consent-aware analytics support.

1. Create a GA4 property in [analytics.google.com](https://analytics.google.com).
2. Obtain your **Measurement ID** (`G-XXXXXXXXXX`).
3. Add the measurement snippet to `<head>` on your pages if desired, wrapped in consent logic:
   ```html
   <!-- Google Analytics 4 (Loaded only after consent or configured via GTM) -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'G-XXXXXXXXXX', { anonymize_ip: true });
   </script>
   ```
4. **Lead Conversion Tracking:**
   When a user submits the enquiry form, `js/forms.js` dispatches the standard GA4 conversion event:
   ```javascript
   dataLayer.push({
     event: 'generate_lead',
     lead_id: result.leadId,
     service: payload.service
   });
   ```
   In GA4, go to **Admin > Events** and mark `generate_lead` as a Key Event (Conversion).

---

## 5. Google Business Profile (GBP) Optimization

1. Claim or manage the profile for **Karma Fire Protection LLP** on Google Business Profile.
2. Ensure the NAP (Name, Address, Phone) matches the website exactly:
   - **Name:** Karma Fire Protection LLP
   - **Primary Category:** Fire Protection Service / Fire Protection Equipment Supplier
   - **Phone:** `+91 95949 67751`
   - **Website URL:** `https://www.karmafireprotection.com`
3. Add service categories matching the site: *Fire Hydrant Installation*, *Fire Alarm Maintenance*, *Automatic Fire Sprinklers*, *Fire Suppression Systems*.
4. Link the profile to the Google Maps location at Vikhroli West, Mumbai.
