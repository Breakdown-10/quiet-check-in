# Ring App Store Certification & Devpost Submission Guide

**Application Name:** Quiet Check-In  
**Submission Category:** Care-taking / IoT Home Automation / Accessibility  
**Target Tracks:** Ring App Developer Primary Track, AWS Builder Mini-Challenge, Open Source Mini-Challenge (`ring-partner-kit`)  
**Certification Readiness:** Production-Ready (Compliant with Ring Appstore Permitted Content Policy & Reviewer Guidelines)

---

## 1. Compliance with Ring Appstore Policies

| Policy Section | Requirement | Quiet Check-In Implementation |
| :--- | :--- | :--- |
| **Section 1.2: Prohibited Surveillance** | Apps must NOT provide covert surveillance, stalking, or cross-property tracking. | **100% Compliant.** Pure ambient event metadata only (doorbell dings, contact sensor state transitions). **Zero video streams (WHEP), zero audio, zero snapshots, zero facial recognition.** Includes an Elder Independence "Away Mode" that allows the resident to pause monitoring at will. |
| **Section 1.4: Medical Claims & Physical Harm** | Medical apps making inaccurate or misleading diagnoses are rejected. Must remind users to consult licensed doctors. | **100% Compliant.** Explicitly framed as a routine rhythm monitor, **NOT a diagnostic or emergency medical tool.** Amazon Bedrock Guardrails block all medical diagnostic claims and alarmist phrases ("stroke", "heart attack", "call 911"). |
| **Section 2.1: App Completeness** | Submissions must be functional with fully accessible backend services and demo access. | **100% Compliant.** Live dual-mode backend (`RingLive` + `RingSim`), complete REST API, and integrated Time-Travel Console for reviewers. |
| **Section 4.1: Data Security & Retention** | Strict data minimization and encrypted transmission. | **100% Compliant.** Constant-time HMAC-SHA256 signature verification over unparsed raw bytes (`X-Ring-Signature`). Raw event records expire automatically via DynamoDB TTL (30 days). |

---

## 2. Reviewer Notes for Ring App Review Team

When submitting Quiet Check-In through the Ring Developer Portal (`Certify` tab), copy and paste these exact specifications:

### Question 1: How can a Ring reviewer create an account on your platform?
> Reviewers can access the Quiet Check-In staging portal immediately without pre-registration at `https://app.quietcheckin.local/` (or locally at `http://localhost:8000/`). A pre-provisioned Care Circle (`circle_frank_phoenix`) with demo elder Frank (78, Phoenix, AZ) and authorized caregiver Maya (45) is pre-configured. To create a custom circle or register new caregivers, reviewers can POST to `/circles/register` with any test email or utilize the built-in demo credentials.

### Question 2: How can a Ring reviewer perform account linking?
> 1. In the Caregiver Dashboard, navigate to **Settings & Care Circle** → **Ring Account Linking**.  
> 2. Click **Connect Ring Account**. This initiates standard OAuth 2.0 PKCE redirection to `https://oauth.ring.com/oauth/authorize?client_id={CLIENT_ID}&scope=ava.devices+ava.events&response_type=code`.  
> 3. Authenticate with your staging Ring account credentials and select authorized devices (Video Doorbells, Motion Sensors, Contact Sensors).  
> 4. Ring redirects back to our Token Exchange URL (`/api/v1/auth/ring/callback`). Our backend stores the scoped access and refresh tokens, establishes an active subscription on the Ring Partner Webhook endpoint (`/api/v1/webhooks/ring`), and redirects back to the dashboard.

### Question 3: How can a Ring reviewer test the end-to-end integration with your app?
> **Testing via Live Devices:**  
> Trigger any Ring Video Doorbell or paired Contact Sensor. Our webhook receiver (`POST /api/v1/webhooks/ring`) cryptographically validates the `X-Ring-Signature` HMAC-SHA256 header against raw request bytes, deduplicates using `meta.request_id`, and immediately populates the **Activity Timeline** tab.  
>  
> **Testing via the Interactive Simulator (Zero Hardware Required):**  
> For reviewers without access to physical US staging hardware, use the **Simulator Time-Travel Console** docked at the bottom of the screen:  
> - **Step 1: Normal Morning:** Ingests 2 signed Ring v1.1 webhooks (7:15 AM back patio contact sensor, 8:05 AM front doorbell motion). The Today card turns **Green (Normal Routine)** and marks anchors as completed.  
> - **Step 2: Missed Paper (L1):** Fast-forwards the clock to 09:25 AM without paper pickup. The engine detects routine deviation and displays an **Amber L1 Alert** card with caregiver action buttons.  
> - **Step 3: Escalate (L2):** Advances to 10:30 AM without family acknowledgment. Promotes the alert to **L2** and triggers the Amazon SES email dispatcher.  
> - **Step 4: Caregiver Feedback Loop:** Click **"I called him, all good"**. The system acknowledges the alert as safe, marks it resolved, and widens the anchor window by +15 minutes for the next 7 days.  
> - **Step 5: AI Family Assistant:** Open the chat drawer in the top right and ask: *"Did Dad get his paper today?"* or *"Why did the alert fire?"*. Bedrock Claude inspects the signal store via Strands tools and returns calm, factual answers with Bedrock Guardrails active.

---

## 3. Devpost Submission Checklist

- [x] **Primary Track Selected:** Ring App Developer Track (Priority Category: Care-taking).
- [x] **Mini-Challenge 1 Selected:** AWS Builder Mini-Challenge (Bedrock Claude 3.5 Sonnet Converse API, Strands Agent tools, DynamoDB single-table, EventBridge Scheduler cron, SES, SAM).
- [x] **Mini-Challenge 2 Selected:** Open Source Mini-Challenge (`ring-partner-kit` MIT package with HMAC verifier, Pydantic v2 models, API client, and Ring Twin simulator).
- [x] **Judging Bonus (10%) Included:** [`PRODUCT_FEEDBACK.md`](PRODUCT_FEEDBACK.md) and [`FRICTION.md`](FRICTION.md).
- [x] **Empirical Benchmark Report:** [`eval/harness.py`](eval/harness.py) (100% recall, 0 false alarms/month over 150 person-days).
- [x] **Automated Test Suite:** 40 passing pytest unit and integration tests.
- [x] **Guided Demo Experience:** Live interactive PWA at `http://localhost:8000/` with Time-Travel Console.
