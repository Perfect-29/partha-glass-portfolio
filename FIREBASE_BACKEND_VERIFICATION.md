# Firebase Backend Verification

**Project:** `partha-portfolio-f22a4`  
**Verification date:** 2026-11-20

This report distinguishes source-code inspection from live Firebase tests. No passwords, API keys, or Firebase data are included. No Firestore documents or Storage objects were created, updated, or deleted during this audit.

| Feature | Status | Evidence |
|---|---|---|
| Firebase initialization and project configuration | **PASS** | All six web configuration values are present in the ignored Firebase-mode environment file; its project ID matches the requested project. The app initializes Firebase and exports Firestore, Auth, and Storage clients. |
| Email/Password sign-in flow | **PASS (implementation)** / **NOT TESTED (live sign-in)** | Admin uses `signInWithEmailAndPassword`, observes auth state, and checks the configured admin UID. A real sign-in was not attempted because no admin password was provided and Email/Password provider state cannot be verified from this workspace. |
| Firestore service/public read | **FAIL (live check)** | A read-only query for published project records reached Firestore and returned HTTP 403 `PERMISSION_DENIED`. This points to deployed rules or service configuration, not a local network timeout. |
| Firestore Create/Read/Update/Delete | **NOT TESTED (live)** | Admin draft save/publish and message-management operations exist in code. No authenticated admin session was available, and no data was written or removed for this audit. |
| Firestore `onSnapshot` subscriptions | **FAIL (live data unavailable)** / **PASS (cleanup implementation)** | The public page remained in “Connecting to the live portfolio” while browser Firestore Listen requests were being aborted/retried; the independent REST read also returned permission denied. Listener groups now stop together after a terminal error, and the public connection state times out with a visible error instead of loading indefinitely. |
| Firebase Storage upload and download URL | **NOT TESTED (live)** | Resumable uploads and `getDownloadURL` are implemented. They require authorized admin authentication; no upload was attempted. Client validation now matches the JPG/PNG/PDF MIME types allowed by the rules. |
| Firestore write security | **PASS (source inspection)** / **NOT TESTED (deployed)** | Portfolio writes and drafts require the admin UID in the rules. Public contact submissions are the only intentional public create path and are schema-limited to `/messages`; there is no blanket public write rule. |
| Storage write security | **PASS (source inspection)** / **NOT TESTED (deployed)** | Uploads and deletes require the admin UID, with MIME-type and size checks. Public reads are allowed on portfolio asset paths for visitor previews/downloads. |
| Admin publish → public real-time update | **NOT TESTED** | The draft/publish flow and public live listeners are implemented, but the live published read currently fails with `PERMISSION_DENIED`, preventing an end-to-end synchronization test. |
| Loading, success, and error states | **PASS (implementation)** | Admin operations expose progress/notices; public portfolio now shows connection progress, a clear configuration/listener error, and retains built-in content as fallback. |
| Contact form / EmailJS | **NOT TESTED (delivery)** | Contact code was not changed. Email delivery and Firestore message archiving require live provider configuration and were not submitted during this audit. |

## Code and rules fixes made

- Grouped public and admin portfolio listeners so terminal listener errors unsubscribe sibling listeners and composition errors are surfaced.
- Added a public-portfolio connection timeout and visible connecting/error status.
- Updated Firestore project validation to accept the `applications` field used by the project data.
- Scoped admin reads to the known application collections and validated admin activity records.
- Aligned project/profile image upload validation with the JPEG/PNG MIME types enforced by Storage rules.
- Kept write access restricted to the configured admin; no broad public write permission was added.

## Firebase Console actions still required

1. Enable **Authentication → Email/Password** and confirm the intended admin account UID matches the allowlist configured in the app and both rules files.
2. Confirm Cloud Firestore and Firebase Storage are enabled for this project and that the configured Storage bucket is the intended bucket.
3. Deploy the repository’s `firestore.rules` and `storage.rules` using an authorized Firebase CLI/Console session. The Firebase CLI is not installed here, so deployed rule versions could not be verified or changed.
4. Re-run the published-record read query after rule deployment. It must no longer return `PERMISSION_DENIED`.
5. Sign in through `/admin`, then use a **new disposable test entry** to verify create/read/update/publish/delete and public live synchronization. Delete only that test entry after confirmation; do not use existing portfolio records.
6. Upload a disposable JPG and PDF through the admin UI, verify their download URLs, and remove only those test files after confirming access.

Do not share an admin password or service-account private key in chat. Authenticate locally in Firebase Console/CLI for the remaining checks.
