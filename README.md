# ❄️ Winter Arc

HTML + CSS + JavaScript + Firebase (Auth + Firestore). No build step.

## Setup (10 minutes)
1. Firebase console → create a project. Add a **Web app** and copy the config into `js/firebase-config.js`.
2. **Authentication** → Sign-in method → enable **Email/Password** and **Google**.
3. **Firestore Database** → create (production mode). Open the **Rules** tab and paste `firestore.rules`, then Publish.
4. **Make yourself Super Admin:** sign up in the app, copy your user ID (Authentication → Users → UID, or open `admin.html` which shows it). In Firestore create collection `admins` → document ID = your UID → add any field (e.g. `role: "super"`).
5. Run locally with a static server (ES modules do not work from file://):
   `npx serve .`  or  `python3 -m http.server 8000`
   Add `localhost` under Authentication → Settings → Authorized domains if needed.
6. Deploy: `npm i -g firebase-tools && firebase login && firebase init hosting && firebase deploy`.

## Proof photos
Photos are resized in the browser (max 800px, JPEG), stamped with date and time, and stored as text in `arcs/{uid}/proofs/{date}`. This works on the free Spark plan (Firebase Storage now needs a billing plan). Near-duplicate photos from other days are rejected.

## Known limits (v1)
- Stats are calculated in the browser. Fine for friends and classmates; for a public launch move them to Cloud Functions.
- Usernames are display handles and are not unique.
- Disabling a user blocks login in the app; fully deleting an Auth account needs the Admin SDK.
