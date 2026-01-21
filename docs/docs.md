# 🛡️ Project Aegis: Anti-Coercion Evidence System

**Aegis** is a forensic-grade personal safety application designed to prevent the destruction of digital evidence during physical confrontations. It shifts the control of data deletion from the device owner to a distributed network of trusted contacts, making it technically impossible for an aggressor to force a victim to delete evidence on the spot.

## 1. The Core Problem
In situations of domestic violence, police misconduct, or civil unrest, perpetrators often force victims to unlock their phones and delete photos or videos immediately after they are taken. This "forced deletion" effectively destroys the only evidence of the event.

Standard camera apps (iOS/Android) and cloud backups (iCloud/Google Photos) are insufficient because:
1.  **Deletion is Instant:** The user has full admin rights to delete files instantly.
2.  **Visible Feedback:** The aggressor can visually confirm the file is gone from the gallery.
3.  **Network Dependence:** If the phone is smashed or offline, evidence recorded but not yet uploaded is lost.

## 2. The Aegis Solution
Aegis introduces the concept of **"Consensus-Based Deletion."**
Once a recording starts, the video data is immediately streamed in small chunks to a secure server.
* **The user CANNOT delete the footage.**
* **The server rejects deletion requests** unless a pre-selected group of "Trusted Contacts" votes to approve it.
* This removes the incentive for violence: The victim can truthfully say, *"I cannot delete this video even if you hurt me. It is out of my hands."*

## 3. Key Features
* **Tamper-Proof Recording:** Video is uploaded in 2-second chunks. Even if the phone is destroyed 5 seconds into recording, the first 4 seconds are already safe on the server.
* **Voting Consensus:** Deletion requires a >60% majority vote from trusted contacts (e.g., friends, lawyers, family).
* **Live Tracking:** Real-time GPS breadcrumbs are sent to the server and visualized on a map for trusted contacts.
* **Forensic Playback:** Videos are reassembled into HLS streams for playback but stored as immutable fragments to prove authenticity.



# 💡 Ideation & Philosophy

## 1. The "Dead Hand" Philosophy
The central philosophy of Aegis is **Loss of Control**. Security usually implies *giving* the user more control (encryption keys, admin rights). Aegis keeps the user safe by *removing* control. By making the user "powerless" to comply with an attacker's demands, we de-escalate the threat of violence used to enforce those demands.

## 2. Design Principles
### A. Aggressor-Centric Design
We assume the phone will be seized.
* **UI Bluff:** The "Delete" button exists in the UI, but clicking it only triggers a *request* process. It gives the aggressor the *feeling* of compliance without the actual result.
* **Panic Triggers:** URLs that look like standard links but trigger instant background recording.

### B. Network Pessimism
We assume the connection is terrible (3G/Edge).
* **Chunking:** Instead of uploading one large 50MB file at the end (which fails if connection drops), we upload twenty 2MB files.
* **Queueing:** Failed chunks are stored in `IndexedDB` and retried automatically when the network recovers.(yet to implement)

### C. The "Witness" Effect
Aggressors behave differently when they know they are being watched.
* **Instant Notification:** The moment recording starts, emails/SMS are fired to contacts. This creates an immediate "digital witness" effect.

## 3. Evolution of the Idea
* **Initial Thought:** A hidden folder app. (Rejected: Aggressors know about hidden folders and can force you to open them).
* **Second Iteration:** Auto-upload to Dropbox. (Rejected: Aggressors can force you to log in to Dropbox and delete the file).
* **Final Concept (Aegis):** Distributed admin rights. Only a consensus of 3rd parties can authorize destruction.


# 🛠️ Technology Stack

Aegis uses a modern, high-performance stack optimized for real-time data ingestion and stream processing.

## 1. Frontend (The Client)
* **Framework:** **Next.js 14 (App Router)**
    * *Why:* React Server Components allow us to keep sensitive logic (like API keys for maps) on the server, while the Client Components handle the complex media recording logic.
* **Styling:** **Tailwind CSS**
    * *Why:* Utility-first classes allow for rapid UI iterations, especially for creating "Stealth Mode" overlays that need to completely change the screen appearance instantly.
* **Media Capture:** **MediaRecorder API**
    * *Why:* Native browser API access to Camera/Microphone without needing a native mobile app wrapper (React Native/Flutter), ensuring zero-friction access via URL.
* **Maps:** **React-Leaflet (OpenStreetMap)**
    * *Why:* Free, open-source mapping that doesn't require expensive Google Maps API billing for high-volume tracking updates.

## 2. Backend (The Core)
* **Runtime:** **Node.js**
* **Framework:** **Fastify**
    * *Why:* Fastify has significantly lower overhead than Express.js (up to 20% faster req/sec). Critical for handling hundreds of small video chunk uploads simultaneously.
* **Database:** **PostgreSQL**
    * *Why:* We need strict relational integrity. Users -> Incidents -> Locations -> Votes. ACID compliance is non-negotiable for evidence chains.
* **Authentication:** **JWT (JSON Web Tokens)**
    * *Why:* Stateless authentication allows the recording client to reconnect seamlessly even if the server restarts or scales.

## 3. Video Processing (The Engine)
* **FFmpeg:**
    * *Role:* Transcoding and HLS Segmenting.
    * *Usage:* Takes the raw WebM chunks from the browser and converts them into `.ts` (MPEG Transport Stream) segments and generates an `.m3u8` playlist for streaming.
* **HLS.js:**
    * *Role:* Client-side playback.
    * *Usage:* Allows the browser to play the stream of chunks smoothly as if it were a single continuous video.

## 4. Infrastructure Services
* **Email:** **Nodemailer (Gmail SMTP)**
    * *Why:* Simple, reliable transport for emergency alerts.
* **Storage:** **Local Filesystem / S3 Compatible**
    * *Current:* Local disk storage for chunks (MVP).
    * *Production Ready:* Can easily swap to AWS S3 for infinite scale.


    # 🏛️ System Architecture



The Aegis architecture follows a **Micro-Monolith** pattern. It is a single deployable backend unit that handles distinct logical domains (Ingest, Playback, Auth, Consensus) efficiently.

## 1. The Ingestion Pipeline (Write-Heavy)
This path is optimized for speed and reliability.
1.  **Client:** Captures video buffer every 2 seconds.
2.  **Client:** Wraps buffer in `FormData` with `incident_id` and `sequence_no`.
3.  **API Gateway (Fastify):** Receives POST `/ingest/chunk`.
4.  **Worker:** Saves raw `.webm` file to disk immediately (Disk I/O is priority).
5.  **DB:** Inserts metadata into `video_chunks` table (id, path, created_at).

## 2. The Playback Pipeline (Read-Heavy)
This path generates a standard HLS stream for viewing.
1.  **Client:** Requests `GET /playback/:id/index.m3u8`.
2.  **Server:** Queries DB for all chunks associated with `incident_id` sorted by `sequence_no`.
3.  **Server:** Dynamically generates the text-based Manifest file (`.m3u8`) pointing to the chunk endpoints.
4.  **Client:** Requests individual `.ts` segments defined in the manifest.
5.  **Server:** Streams the requested video segment.

## 3. The Consensus Engine (Logic-Heavy)
The "Security Brain" of the system.
1.  **Trigger:** User requests deletion via POST `/voting/request-deletion`.
2.  **DB:** Updates Incident status to `PENDING_DELETION`.
3.  **Notifier:** Sends async emails to all `contacts` linked to `user_id`.
4.  **Voter:** Contact clicks link -> Authenticates -> POST `/voting/vote`.
5.  **Logic:** Server calculates: `(Delete Votes / Total Trusted Contacts)`.
6.  **Resolution:**
    * If Ratio > 0.6: Update status `SOFT_DELETED`. (Files hidden, not destroyed yet).
    * If Vote = 'KEEP': Update status `ACTIVE` immediately.

## 4. Database Schema (Entity Relationships)
* **Users:** `(id, email, password_hash, phone)`
* **Incidents:** `(id, user_id, status, created_at)`
    * *Status Enum:* ACTIVE, ENDED, PENDING_DELETION, SOFT_DELETED
* **Incident_Locations:** `(id, incident_id, lat, lng, time)`
* **Contacts:** `(user_id, name, phone, email)`
* **Deletion_Requests:** `(id, incident_id, reason, status)`
* **Deletion_Votes:** `(request_id, voter_id, choice)`

## 5. Security Layers
1.  **Transport:** HTTPS only.
2.  **Authentication:** Bearer Token (JWT) required for all routes except `/login`.
3.  **Authorization:**
    * Recorders can only append to their own `incident_id`.
    * Voters can only vote on requests where they are a listed contact.


# ⚖️ Technical Decisions & Trade-offs

## 1. Why Fastify instead of Express?
* **Decision:** Used Fastify.
* **Reasoning:** Express is older and has larger overhead per request. Since our app records video by sending **thousands** of tiny requests (one every 2 seconds per user), the backend needs to handle high concurrency with low latency. Fastify's schema-based validation and efficient routing make it superior for this specific "high-frequency ingestion" workload.

## 2. Why Chunked Uploads instead of WebSockets?
* **Decision:** Used HTTP POST for chunks.
* **Reasoning:** WebSockets are great for real-time text, but maintaining a stable socket connection on a moving mobile device (switching from WiFi to 4G to 3G) is fragile. If the socket breaks, the buffer logic gets complex.
* **Benefit:** Standard HTTP POSTs are stateless. If one fails, we just retry it. It’s robust against flaky networks.

## 3. Why PostgreSQL instead of MongoDB?
* **Decision:** Used PostgreSQL (Relational).
* **Reasoning:** The voting logic requires strict consistency. We cannot have a "Keep" vote and a "Delete" vote conflicting due to eventual consistency (common in NoSQL). We need relational joins to verify: "Is this Voter actually in the Contact list of the Incident Owner?" SQL handles these integrity checks natively.

## 4. Why Client-Side GPS Polling?
* **Decision:** The React client polls GPS and sends to API.
* **Reasoning:** We considered doing this on the server side via IP address, but IP geolocation is notoriously inaccurate (city-level). For physical safety, we need street-level precision (3-meter accuracy) which only the device's native GPS hardware can provide.

## 5. Why No "Hard Delete"?
* **Decision:** "Deletion" only flags the file as `SOFT_DELETED`.
* **Reasoning:** If an attacker forces a consensus (e.g., threatens all the contacts), we still need a fail-safe. A `SOFT_DELETED` file is hidden from the user/attacker but remains on the server disk for 30 days before a system cron job permanently scrubs it. This provides a final window for legal subpoena if necessary.



# 🔄 Workflow & User Journey

This document outlines the step-by-step flow of the Aegis system from the perspective of different actors.

## Actor 1: The User (Victim)
### Phase 1: Setup
1.  User signs up via `/signup`.
2.  User adds Trusted Contacts (Name & Phone) in `/contacts`.
3.  System links these contacts to registered Aegis accounts.

### Phase 2: The Incident
1.  **Trigger:** User feels unsafe. Opens app or panic link.
2.  **Recording:** User hits "Record".
    * Camera activates.
    * GPS locks on.
    * System creates `ACTIVE` incident.
    * **Notification:** Contacts receive email/SMS: *"SOS: Jane is recording."*
3.  **Streaming:** Video chunks upload automatically every 2s.
4.  **Termination:** User hits "Stop". Incident status -> `ENDED`.

### Phase 3: The Coercion
1.  **Threat:** Attacker demands: "Delete that video now!"
2.  **Request:** User clicks "Delete" on the dashboard.
3.  **Block:** App shows: *"Deletion Request Sent. Awaiting Consensus."*
4.  **Defense:** User shows screen: *"I can't delete it. It's locked by the system."*

## Actor 2: The Trusted Contact (The Voter)
1.  **Alert:** Contact receives email: *"Jane requested deletion. Reason: 'He let me go'."*
2.  **Review:** Contact clicks link -> logs in.
3.  **Assessment:**
    * Does the reason sound genuine?
    * Is Jane actually safe?
    * (Optional) Contact calls Jane to verify code word.
4.  **Action:**
    * **Vote KEEP:** If suspicious. The file is permanently locked.
    * **Vote DELETE:** If verified safe.

## Actor 3: The System (The Observer)
1.  **Monitoring:** Tracks incoming chunks.
2.  **Synthesis:** Assembles chunks into HLS playlist.
3.  **Tallying:** Continuously counts votes on pending requests.
4.  **Execution:** Changes incident status based on vote outcome.