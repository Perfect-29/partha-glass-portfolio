# Portfolio Template

Red-and-black 3D portfolio (React + Three.js + GSAP). **You only do 3 things.**

This copy is personalized for PARTHASARATHY A. The hero and square About frame use optimized WebP assets with responsive variants. The original PNG and JPEG files remain in `public/assets` for legacy references and social previews.

---

## Step 1 · Portrait

The glass-shard hero and About section use separate optimized images. Their defaults and responsive variants are selected in `src/data/portfolioData.ts`, `src/components/Hero.tsx`, and `src/components/About.tsx`; do not overwrite the originals when regenerating optimized files.

Project screenshots: save as `public/assets/thumbnails/project-1-1.jpg`, `project-1-2.jpg`, `project-1-3.jpg`, `project-2-1.jpg` … (1280x720).

---

## Step 2 · Let Claude fill in your content

1. Fill in the **About Me** block below (just replace the text).
2. Open Claude, paste the **prompt**, then paste your About Me, then paste the full contents of `src/data/portfolioData.ts`.
3. Copy Claude's reply over `src/data/portfolioData.ts`.

### About Me (fill this in)

```
Name:
Role / title:
Email:
Phone / WhatsApp (with country code, digits only):
GitHub URL:
LinkedIn URL:
Short bio (2-4 sentences, who you are and what you build):
Technologies you use (for the logo strip):
Areas of focus (3):
Top 6 skills + level (Advanced / Proficient):
Projects (6 or 9). For each: name, one-line subtitle, what it does, tech used, live link, GitHub link:
Services you offer + prices (5):
Numbers to show (projects built, technologies, services):
Loading-screen sentence (a short bold line about what you do):
```

### Prompt for Claude

```
I am using a portfolio website template. Below is MY ABOUT ME info, followed by the
current src/data/portfolioData.ts file.

Rewrite the ENTIRE portfolioData.ts file with my details. Rules:
- Keep every export name, key, type and the file structure exactly the same. Only change values.
- Write in first person, confident, concise, no buzzword filler. Improve my wording where needed.
- HERO.headline is my name in CAPS. SITE.phone is digits only with country code.
- Projects: 6 or 9 entries, ids in kebab-case, poster set to
  /assets/thumbnails/project-<n>-1.jpg (n = project order). Keep liveUrl/repoUrl only if I gave them.
- TECH_STACK: my technologies (names with built-in logos: React, JavaScript, Python, FastAPI, PostgreSQL, Supabase, SQLite, Three.js, GSAP; any other name shows a lettered badge).
- SKILL_CARDS: exactly 6 cards. SERVICES_PRICING: 5 items. CLIENT_STATS: 3 items.
- LOADER.redWords must be words that appear in LOADER.statement.
- If my portrait is a .jpg instead of .webp, set ABOUT.portrait accordingly.
- Return only the complete file in one code block.

MY ABOUT ME:
<paste your filled About Me here>

CURRENT FILE:
<paste src/data/portfolioData.ts here>
```

---

## Step 3 · Run it

```
npm install
npm run dev       # preview at http://localhost:5173
npm run build     # production files in dist/ (upload to Netlify / Vercel / GitHub Pages)
```

That's it. All text is in `src/data/portfolioData.ts`, all images are in `public/`.

## Contact form email setup

The contact form sends through EmailJS; it does not open the visitor's email app.

1. In `src/data/portfolioData.ts`, set `SITE.email` to the Gmail address that should receive portfolio messages.
2. In EmailJS, connect that Gmail account to an email service and create a template. Set the template's **To Email** to the same fixed Gmail address. Do not make the recipient a visitor-controlled template variable.
3. Use these template variables:
   - **From Name:** `{{from_name}}`
   - **Reply-To:** `{{reply_to}}`
   - **Subject:** `Portfolio inquiry from {{from_name}}`
   - **Body:** include `{{from_name}}`, `{{from_email}}`, and `{{message}}`
4. Copy `.env.example` to `.env.local` and fill in the EmailJS **Service ID**, **Template ID**, and **Public Key**. These `VITE_` values are shipped to the browser; use only EmailJS's public key here, never a private API key or Gmail password.
5. In EmailJS, restrict allowed origins to localhost during development and to your deployed portfolio domain in production. Review EmailJS rate-limit and abuse protections before publishing.
6. Restart `npm run dev`, submit a test message, and verify delivery in the recipient inbox (including spam). A successful UI notification is shown only after EmailJS confirms the send; configuration and delivery failures are reported without clearing the form.

## Firebase Admin CMS

The protected `/admin` route is backed by Firebase Authentication, Cloud Firestore, and Firebase Storage. It uses Firestore collections for the portfolio editor, unpublished drafts, contact-message archive, and admin activity. The public website no longer reads its portfolio content from Firestore; its read-only Supabase integration is described below.

Unpublished changes are stored separately in the admin-only `drafts/{collection}__{recordId}` documents so private draft fields are never exposed by public reads. The singleton documents are `profile/main` and `siteSettings/main`; portfolio entries use their entry ID as the document ID. Contact submissions are stored in `messages/{messageId}` and can only be created publicly with validated fields; reads and changes are admin-only. Admin activity uses `portfolioActivity/{activityId}`. Saving writes a complete draft snapshot; publishing applies the draft records and deletions atomically to the public collections. Static portfolio data remains the initial fallback until published records are available.

### Configure the Firebase project

1. Enable **Email/Password** in Firebase Authentication, add localhost and your production host to Authorized domains, and create the administrator account using the intended admin email.
2. Ensure the default Cloud Firestore database exists and the **Cloud Firestore API** is enabled for the Google Cloud project. An API-disabled response prevents live reads even if Storage and Authentication are enabled.
3. Confirm that the account UID matches the allowlisted UID in both `firestore.rules` and `storage.rules`. The client-side `VITE_FIREBASE_ADMIN_UID` must match too. Never put an admin password or service-account key in this project.
4. Keep the Firebase Web SDK settings in the ignored `.env.firebase.local` file for local development. `npm run dev` and `npm run build` use the `firebase` Vite mode. The Web SDK config is public client configuration; restrict its API key by HTTP referrer in Google Cloud and rely on Firebase rules for authorization.
5. For deployment, configure the same `VITE_FIREBASE_*` build variables in the hosting provider before building. Do not deploy the local `.env.firebase.local` file.
6. Review `firestore.rules` and `storage.rules` before applying them. To deploy through Firebase Console, confirm that the selected project is `partha-portfolio-f22a4`, then open **Firestore Database → Rules**, replace the editor contents with the reviewed `firestore.rules`, and select **Publish**. Next open **Storage → Rules**, replace the editor contents with the reviewed `storage.rules`, and select **Publish**. Do not publish until the admin UID in both rules files matches the intended administrator account. These rules restrict portfolio writes and uploads to that admin; the only public Firestore create path is schema-validated contact-message submission.

7. Open `/admin`, sign in, edit a section, save a draft, preview it in a local tab, then publish. Visitors can read only published portfolio records; content writes and all draft access are restricted to the configured admin UID. A first publish creates the collection documents.

### Dashboard behavior

- The editor exposes Home/Hero, About/Profile, Projects, Skills, Experience, Education, Certifications, Achievements, Internships, Workshops & Events, Coding Profiles, Publications, Resume/CV, Contact/Socials, and Messages. The credential modules support add, edit, confirmed delete, reorder, per-entry publish/unpublish, draft save, and publish.
- Certification, achievement, internship, workshop, publication, resume, profile, and project files upload to their matching Firebase Storage folders. JPG/PNG uploads are limited to 10 MB and PDFs to 15 MB; unsupported MIME types are rejected. Uploaded URLs and file metadata are saved with the Firestore draft. Public visitors can download assets but cannot list folders; writes are restricted to the configured administrator UID.
- Coding profiles display stored profile links and usernames only; no profile statistics are fabricated. No certificate, award, internship, workshop, or publication examples are pre-populated.
- Draft preview is local to the administrator's browser and does not publish content. Firebase admin publishes do not populate Supabase; public portfolio content must be seeded into Supabase before the Firebase CMS can be retired.
- The dashboard provides project, certification, achievement, internship, workshop, publication, and contact-message totals, plus draft/publish timestamps and a recent activity feed. Preserve the existing EmailJS setup for contact delivery.

## Supabase database schema and public portfolio reads

The reviewed initial schema is in `supabase/migrations/20261120133001_initial_portfolio_schema_reviewed.sql`. The superseded proposal is retained outside the active migration directory at `supabase/archive/20261120133000_initial_portfolio_schema_unreviewed.sql` and must not be applied. The migration creates UUID-backed tables for the current portfolio record models, retaining each existing string document ID as unique `record_id` (the profile and settings singleton use `main`). Nested profile and site settings objects remain JSONB. It also creates a private `admin_users` allowlist used by RLS. The migration creates schema and policies only; it does not seed content or migrate Firebase data. The public app refreshes portfolio content from Supabase Realtime when the corresponding tables are enabled in the project's Realtime publication.

### Fire Effects Studio

The admin dashboard's Fire Effects Studio stores its validated settings in the `fire_effects` JSONB column on `site_settings/main`. Apply `supabase/migrations/20261120133002_add_fire_effect_settings.sql` after the reviewed initial schema migration. The application falls back to the original classic-fire defaults and disables saving until this forward migration is present. Public visitors receive changes from the existing `site_settings` Realtime subscription only when that record is published. The admin editor updates only `fire_effects`, the record's publication status, and its update metadata; it does not replace unrelated site settings.

The public React app uses the typed read-only service in `src/lib/supabasePortfolioRepository.ts`. It filters every table by `published = true`, reads `profile/main` and `site_settings/main`, and orders list records by `display_order`. Existing content remains the fallback for empty sections and request failures. Images stored as object paths use the public `portfolio-images` bucket; private document paths use signed URLs from `portfolio-documents`. Create and configure those Storage buckets and their policies in Supabase before publishing uploaded assets; the SQL migration does not configure Storage.

### Automatic Experience conversion

Apply `supabase/migrations/20261121112900_experience_conversion_sync.sql` after the reviewed schema and the existing Fire Effects and contact-management migrations. Database triggers convert each Projects, Achievements, Skills, Internships, Workshops, Certifications, Publications, and Education record into its own Experience row. The conversion stores a unique `(source_type, source_record_id)` reference, copies only available source facts, and follows source publish and delete changes. Existing source rows are backfilled when the migration runs.

Source-derived entries are labeled in the Experience manager. Their source details and publication state are controlled by the original section; administrators may edit the derived description, and later source updates preserve that manual description without changing the source record. Manual Experience entries remain independent. Trigger functions are not executable by client roles; source writes continue to use the existing admin RLS policies.

### Apply the migration

Review and apply the reviewed initial migration and then the forward migrations in timestamp order to the intended Supabase project. The unreviewed proposal has been archived so `db push` will not attempt to create the same tables twice.

- With the Supabase CLI installed and authenticated, inspect the linked project and migration history first, then link the intended project and run `npx supabase db push` from the repository root; or
- Open the intended project's **SQL Editor** and run, in order, `supabase/migrations/20261120133001_initial_portfolio_schema_reviewed.sql`, `supabase/migrations/20261120133002_add_fire_effect_settings.sql`, `supabase/migrations/20261121010900_contact_management.sql`, and `supabase/migrations/20261121112900_experience_conversion_sync.sql` as a trusted project administrator.

Do not run both the archived proposal and reviewed migration. Inspect migration history before applying; if the older version is already recorded as applied, stop and reconcile migration history rather than pushing blindly. On an initialized project, apply only forward migrations that are not already recorded; do not rerun the initial schema migration. The reviewed migration does not delete or alter Firebase data. No service-role or secret key belongs in the browser or repository.

The Experience conversion lifecycle checks are in `supabase/tests/experience_conversion_sync.sql`. Run that script in a disposable database after applying the migrations; it wraps its fixture inserts and assertions in a transaction and rolls them back.

### Create the first admin securely

1. In Supabase **Authentication → Users**, create the intended user using a unique password and complete any required email verification. Do not put credentials in project files or share them.
2. Copy that user's UUID from the Auth user details.
3. In the trusted SQL Editor, insert only that UUID into the allowlist:

   ```sql
   insert into public.admin_users (user_id)
   values ('<AUTH_USER_UUID>');
   ```

   Replace the placeholder with the UUID of the account you just created. `admin_users` has RLS enabled and no client grants; do not make it publicly writable. Admin status is determined by this table, not by user-editable metadata.
4. Verify public reads expose only rows with `published = true`, public message submission cannot read messages, and a non-allowlisted authenticated user cannot modify portfolio rows before enabling Supabase admin flows.

The public portfolio reads from Supabase, while `/admin` and its CMS still use Firebase. Contact delivery remains on EmailJS with its existing Firestore message archive, as that flow has not been migrated. Do not remove Firebase from admin or contact paths until those flows have been implemented and tested against Supabase.
