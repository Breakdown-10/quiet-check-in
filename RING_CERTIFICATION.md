# Ring App Store Alignment & Submission Guide

> **Note for Hackathon Judges:** Please see [**`JUDGE_QUICKSTART.md`**](JUDGE_QUICKSTART.md) for the 3-command setup and 5-click interactive demonstration walkthrough.

**Application Name:** Quiet Check-In  
**Submission Category:** Care-taking / IoT Ambient Automation / Accessibility  
**Target Tracks:** Ring App Developer Primary Track, AWS Builder Mini-Challenge, Open Source Mini-Challenge (`ring-partner-kit`)  
**Deployment Status:** Prototype / Hackathon MVP (Validated via Ring Twin simulator against documented Ring v1.1 webhook schemas).

---

## 1. Architectural Alignment with Ring Appstore Guidelines

| Policy Area | Objective | Quiet Check-In Implementation |
| :--- | :--- | :--- |
| **Privacy & Non-Intrusive Care** | Prevent covert surveillance or non-consensual tracking. | **Ambient Event Metadata Only.** Zero video streams (WHEP), zero audio recording, zero still snapshots, zero facial recognition. Respects elder independence with a dedicated "Away Mode" that lets the resident pause monitoring at will. |
| **Medical Disclaimer** | Prevent misleading medical diagnoses and remind users to consult physicians. | Framed strictly as a **routine rhythm monitor**, NOT a diagnostic or emergency medical alert system. Built-in Bedrock Guardrails filter out alarmist terms ("stroke", "heart attack", "call 911"). |
| **Security & Ingestion Integrity** | Secure webhook ingestion and protect against replay attacks. | Constant-time HMAC-SHA256 signature verification over unparsed raw bytes (`X-Signature` with `X-Ring-Signature` fallback). 300-second timestamp drift tolerance and idempotent deduplication via `meta.request_id`. |
| **Data Minimization & Retention** | Strict data minimization for ambient IoT events. | Retains only timestamped device events. Raw event records expire automatically via DynamoDB TTL (30 days). |

---

## 2. Reviewer Notes for Evaluation

### How can a reviewer access the app?
Reviewers can launch Quiet Check-In locally at `http://localhost:8000/`. A pre-configured Care Circle (`circle_frank_phoenix`) with demo elder Frank (78, Phoenix, AZ) and caregiver Maya is pre-provisioned.

### How does account linking and device pairing work?
In an enterprise Ring App Store deployment, device linking pairs authorized Ring devices (Video Doorbells, Contact Sensors, Motion Detectors) to the Care Circle via the partner API. In the hackathon prototype, devices are managed via the built-in dual-mode adapter (`RingGateway`), allowing immediate testing via physical webhooks or the integrated software twin.

### How can a reviewer test the end-to-end integration?
* **Testing via Webhook POST:**  
  Send an HTTP POST to `POST /webhooks/ring` with an HMAC-SHA256 signature in the `X-Signature` header. The backend verifies raw bytes, deduplicates `meta.request_id`, and ingests the signal into the timeline.
* **Testing via Interactive Time-Travel Console (Zero Hardware Needed):**  
  Reviewers can use the docked console at `http://localhost:8000/` to step through normal routines, missed morning anchors, escalation to secondary caregivers, feedback window widening, and AI conversational inquiries.

---

## 3. Submission Track Checklist

- [x] **Primary Track Selected:** Ring App Developer Track (Category: Care-taking).
- [x] **Mini-Challenge 1 Selected:** AWS Builder Mini-Challenge (Bedrock Claude 3.5 Sonnet Converse API, Agentic tool-use, DynamoDB single-table, EventBridge Scheduler cron, SES, SAM).
- [x] **Mini-Challenge 2 Selected:** Open Source Mini-Challenge (`ring-partner-kit` MIT package with HMAC verifier, Pydantic v2 models, API client, and Ring Twin simulator).
- [x] **Judging Bonus (10%) Included:** [`PRODUCT_FEEDBACK.md`](PRODUCT_FEEDBACK.md) and [`FRICTION.md`](FRICTION.md).
- [x] **Empirical Benchmark Report:** [`eval/harness.py`](eval/harness.py) (180 person-days evaluated; synthetic simulation benchmark).
- [x] **Automated Test Suite:** 47 passing pytest unit and integration tests.
- [x] **Guided Demo Experience:** Live interactive PWA at `http://localhost:8000/` with Time-Travel Console.
