# Quiet Check-In

> **Privacy-First Ambient Routine Intelligence for Elder Care**  
> *Submission for Build, Ship, Shape: Amazon Developer Hackathon (2026)*  
> **Track:** Ring App Developer Primary Track | **Mini-Challenges:** AWS Builder + Open Source (`ring-partner-kit`)

[![Judge Quickstart](https://img.shields.io/badge/Judge-Quickstart%20Guide-blueviolet.svg)](JUDGE_QUICKSTART.md)
[![Tests: 47 Passed](https://img.shields.io/badge/tests-47%20passed-brightgreen.svg)](tests/)
[![Eval: 100% Recall](https://img.shields.io/badge/eval%20recall-100%25-brightgreen.svg)](eval/)
[![Precision: 94.7%](https://img.shields.io/badge/precision-94.7%25-brightgreen.svg)](eval/)
[![False Alarms: 0.17/mo](https://img.shields.io/badge/false%20alarms-0.17%2Fmo-brightgreen.svg)](eval/)
[![AWS: SAM & Bedrock](https://img.shields.io/badge/AWS-SAM%20%7C%20Bedrock%20Claude-orange.svg)](template.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> 🚀 **Judging Quiet Check-In?** Start with our 1-page [**`JUDGE_QUICKSTART.md`**](JUDGE_QUICKSTART.md) for 3 commands to run, 5 clicks to demo, and our Real vs. Simulated reality table.

---

## 🌟 The Core Idea: "Absence is the Signal"

Elder monitoring systems face an unavoidable dilemma:
1. **Intrusive surveillance cameras** rob aging parents of dignity and independence, causing elders to unplug or cover them.
2. **Panic buttons and wearables** are frequently forgotten on nightstands, left in chargers, or discarded in drawers.

**Quiet Check-In** takes a completely different path:
We monitor **routine rhythm through ambient Ring device metadata alone**—timestamps and device labels from standard doorbells, contact sensors, and motion detectors.

- 🚫 **Zero Video Streams (WHEP)**
- 🚫 **Zero Audio Recording**
- 🚫 **Zero Still Snapshots**
- 🚫 **Zero Wearables to Remember**
- 🚫 **Zero Facial Recognition**

When an elder goes about their day (opening the medicine cabinet, moving through the hallway, brewing coffee in the kitchen), the home naturally breathes. **Absence is the signal**: if the expected morning window closes without normal activity, the system steps through a deterministic, gentle escalation ladder to keep family connected without panic.

---

## 📐 System Architecture

```mermaid
flowchart TD
    subgraph Ring Home ["Elder's Home (Ring Devices)"]
        D1["Doorbell Pro"] -->|v1.1 Webhook| API
        D2["Hallway Motion Sensor"] -->|v1.1 Webhook| API
        D3["Medicine Cabinet Sensor"] -->|v1.1 Webhook| API
        D4["Kitchen Motion Sensor"] -->|v1.1 Webhook| API
    end

    subgraph AWS ["AWS Serverless Cloud (us-east-1)"]
        API["Amazon API Gateway HTTP API"] --> Ingest["Ingest Lambda\n(HMAC-SHA256 Verifier)"]
        Ingest -->|Deduplicated Signals| DDB[("Amazon DynamoDB\n(Single-Table Design)")]
        
        Cron["Amazon EventBridge Scheduler\n(Every 5 Minutes)"] --> Evaluator["Routine Evaluator Lambda\n(Gaussian KDE + MAD Engine)"]
        Evaluator <--> DDB
        
        Evaluator -->|Anomaly Escalation| Escalator["Deterministic Escalation Ladder\n(L0 -> L1 -> L2 -> L3)"]
        
        Escalator --> Narrator["Amazon Bedrock Narrator\n(Claude 3.5 Sonnet Converse API)"]
        Narrator --> Guardrails["Amazon Bedrock Guardrails\n(No Medical/Alarmist Language)"]
        Guardrails --> Fallback["Deterministic Template Fallback"]
        
        Fallback --> SES["Amazon SES\n(One-Tap Action Email)"]
        
        API <--> Assistant["AI Family Assistant\n(Agentic Tool-Assisted Q&A)"]
        Assistant <--> DDB
    end

    subgraph Family ["Family / Caregiver Experience"]
        SES --> FamilyPhone["Caregiver Email\n(Acknowledge / Check In)"]
        API <--> PWA["Quiet Check-In Family Dashboard\n(PWA + Time-Travel Console)"]
    end
```

---

## 🚀 Key Features

### 1. Robust Webhook Ingestion & Cryptographic Verification
- Real-time ingestion of Ring Developer API v1.1 Webhook envelopes.
- Constant-time HMAC-SHA256 signature verification over unparsed raw request bytes (`X-Signature` with `X-Ring-Signature` fallback).
- Timestamp drift tolerance check (300s window) mitigating replay attacks.
- Exact deduplication via `meta.request_id` with 48-hour automated DynamoDB TTL.

### 2. Statistical Routine Intelligence (KDE + MAD)
- Discovers personalized daily anchors (morning wake, medicine cabinet, lunch, evening activity) using **Gaussian Kernel Density Estimation (KDE)**.
- Computes dynamic tolerance bounds via **Median Absolute Deviation (MAD)**:
  $$\text{Window} = \text{Median} \pm \max(30\text{m},\ 2.5 \times 1.4826 \times \text{MAD}) + 30\text{m grace}$$
- Requires $\ge 60\%$ historical support before promoting a recurring cluster into an enforced anchor.
- Handles waking silence ($\ge 8$ daytime hours) while strictly excluding scheduled sleep hours (10:00 PM – 7:00 AM).
- Evaluates device battery and connection health, automatically suppressing false alarms if sensors go offline or Elder Away Mode is active.

### 3. Deterministic Escalation State Machine
* **L0 (Normal Routine / Grace):** Routine is within statistical bounds or within early grace. In-app dashboard status only.
* **L1 (Primary Caregiver Nudge):** 30 minutes past grace window. Amazon SES email dispatched to primary caregiver (Maya) citing baseline facts with one-tap acknowledgment links.
* **L2 (Secondary Circle / Neighbor):** 45 minutes of silence without acknowledgment. Reaches secondary circle member (neighbor Sam) for a look-in.
* **L3 (Circle Action):** 60 additional minutes without acknowledgment, or prolonged daytime silence (8+ daytime hours). Prompts direct in-person check.
* **Night Silence:** Automatic quiet hours suppression between 10:00 PM and 7:00 AM for non-critical alerts.
* **Caregiver Feedback Loops:**
  - *"I called Frank, all is well":* Mutes alert and automatically widens the anchor tolerance window by +15 minutes for 7 days.
  - *"Can't reach him":* Immediately promotes alert to L2/L3 for immediate circle check.
  - *Activity Resumption:* Fresh sensor events automatically resolve active alerts, marking "Routine Resumed".

### 4. AI Narrator & Family Chat (Amazon Bedrock)
- **Bedrock Claude 3.5 Sonnet:** Powered by the Amazon Bedrock Converse API with tool-use capabilities (`toolConfig`).
- **Amazon Bedrock Guardrails:** Enforces regulatory and safety guardrails, filtering out medical diagnoses, panic words, and emergency claims ("stroke", "heart attack", "call 911").
- **Agentic Status Tools:** Conversational AI inspects today's status, recent device signals, and explains why an anchor was formed.
- **Guaranteed Template Fallback:** If Bedrock is throttled or unreachable, a deterministic template narrator formats all alerts without interruption.

### 5. Open Source Mini-Challenge: `ring-partner-kit`
We packaged our reusable developer toolkit into an open-source, MIT-licensed Python package located in [`ring-partner-kit/`](ring-partner-kit/):
- **`RingWebhookVerifier`:** Timing-safe HMAC-SHA256 verifier with timestamp drift validation.
- **Pydantic v2 Models:** Strict schemas for Ring v1.1 Webhooks, device metadata, and normalized signals.
- **`RingApiClient`:** OAuth2 PKCE token lifecycle manager with exponential backoff retry and rate limit tracking.
- **`RingTwinSimulator`:** Standalone hardware simulator with CLI (`ring-twin`) and Gaussian schedule generation for local/CI testing.

---

## 📊 Evaluation Harness & Empirical Results

We benchmarked Quiet Check-In using our automated simulator across 6 diverse elder routine personas over 180 person-days (including early risers, medication-strict, late sleepers, and benign holiday sleep-ins).

> **Note on Evaluation Methodology:** Synthetic data benchmark generated via our Ring Twin simulator to validate statistical bounds and state machine logic under controlled conditions; not clinical validation.

```text
====================================================================
        QUIET CHECK-IN: ROUTINE INTELLIGENCE EVALUATION REPORT
  [SYNTHETIC BENCHMARK - SIMULATED PERSONAS, NOT CLINICAL VALIDATION]
====================================================================
 Personas Simulated           : 6 distinct elder routines
 Total Days Evaluated         : 180 person-days
 Injected Routine Breaks      : 18 true anomalies
--------------------------------------------------------------------
 True Positives (Detected)    : 18
 False Positives (Spurious)   : 1
 False Negatives (Missed)     : 0
--------------------------------------------------------------------
 Detection Recall (Target >=90%): 100.0%  [PASS]
 Detection Precision          : 94.7%
 False Alerts per Person-Month: 0.17 (Target < 1.0)  [PASS]
 Mean Detection Latency       : 10.0 minutes past grace window
--------------------------------------------------------------------
 Grace Window Sensitivity & Trade-off Analysis:
   * Grace 15m : Recall 100.0% | False Alarms 0.83/mo | Latency  5.0m
   * Grace 30m : Recall 100.0% | False Alarms 0.17/mo | Latency 10.0m [DEFAULT]
   * Grace 45m : Recall  94.4% | False Alarms 0.00/mo | Latency 15.0m
====================================================================
```

---

## 🛠️ Quick Start

### Prerequisites
- Python 3.10+ (tested on Python 3.12)
- Node.js 18+ (optional, for frontend development)
- AWS CLI & SAM CLI (optional, for AWS deployment)

### 1. Installation
Clone the repository and install dependencies:
```bash
# Install backend and open-source partner kit
pip install -r backend/requirements.txt
pip install -e ring-partner-kit
```

### 2. Run Tests
Execute the full automated test suite (47 unit and integration tests):
```bash
python -m pytest
```

### 3. Run Evaluation Harness
Run the statistical routine intelligence benchmark across 180 person-days:
```bash
python -m eval.harness
```

### 4. Launch Local Interactive Demo
Start the backend server and family dashboard:
```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
Open **[http://localhost:8000/](http://localhost:8000/)** in your browser.

---

## 🎮 Interactive Time-Travel Console & Demo Guide

The Family Dashboard served at `http://localhost:8000/` contains a live **Time-Travel Console** at the bottom dock:

1. **Normal Morning (08:50 AM):** Click `Normal Morning Routine (08:50 AM)`. Observe Frank's morning wake, patio walk, meds, and morning paper marked as completed. The status card shows **All Quiet & Well (L0)**.
2. **Routine Missed (09:45 AM):** Click `Missed Morning Paper (09:45 AM, L1)`. Frank had coffee and meds, but missed picking up the paper. The clock advances past the grace window; the status card turns **Amber (L1 Alert)** citing baseline evidence.
3. **Escalate to L2 (11:15 AM):** Click `Escalate to L2 (11:15 AM)`. Advances past 11:15 AM without acknowledgment; promotes the alert to **L2 (Secondary Circle / Neighbor)**.
4. **Caregiver Feedback:** Click **"I called Frank, all is well"**. Alert marks resolved, and the system widens Frank's morning window by +15 minutes for the next 7 days.
5. **AI Assistant Drawer:** Open the chat drawer (top right) and ask:
   - *"Did Dad get his paper today?"*
   - *"Why did the system alert me?"*
   - *"When did he last open the back door?"*
6. **Reset Schedule:** Click `Reset to 07:00 AM` to restore fresh morning schedule.

---

## ☁️ AWS Cloud Deployment (SAM)

Quiet Check-In is designed for serverless cloud execution via AWS SAM:

```bash
# Build the SAM application
sam build

# Deploy interactively to AWS (us-east-1 recommended for Bedrock Claude)
sam deploy --guided
```

Resources provisioned:
- **API Gateway HTTP API:** Low-latency webhook and client REST endpoints.
- **DynamoDB Single-Table:** On-demand capacity with TTL and GSI1.
- **Webhook Ingestion Lambda:** Arm64 Python 3.12 with raw-body HMAC verification.
- **Routine Evaluator Lambda:** EventBridge Scheduler 5-minute cron.
- **IAM Policies:** Least-privilege access for Bedrock (`InvokeModel`, `ApplyGuardrail`) and SES (`SendEmail`).

---

## 📑 Hackathon Deliverables & Documentation

- [**Judge Quickstart Guide (`JUDGE_QUICKSTART.md`)**](JUDGE_QUICKSTART.md): 3 commands, 5-click walkthrough, and Real vs. Simulated table.
- [Quiet Check-In PRD (`Quiet Check-In_PRD.md`)](Quiet%20Check-In_PRD.md): Complete engineering product requirements document.
- [Ring App Store Alignment Guide (`RING_CERTIFICATION.md`)](RING_CERTIFICATION.md): Guidelines alignment, reviewer instructions, and submission checklist.
- [Developer Friction Log (`FRICTION.md`)](FRICTION.md): Technical friction points encountered with Ring API staging, webhooks, and event history.
- [Product & Developer Feedback (`PRODUCT_FEEDBACK.md`)](PRODUCT_FEEDBACK.md): Comprehensive evaluation of Ring API, Bedrock Converse, and AWS SAM.
- [Open Source Toolkit (`ring-partner-kit/`)](ring-partner-kit/): Standalone MIT-licensed developer SDK and hardware simulator.
- [AWS SAM Template (`template.yaml`)](template.yaml): Production-ready Infrastructure as Code template.

---

## 👥 Contributors & License

Built with ❤️ for the **Amazon Developer Hackathon 2026**.  
Licensed under the [MIT License](LICENSE).
