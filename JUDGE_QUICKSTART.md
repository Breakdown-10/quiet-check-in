# Quiet Check-In — Judge Quickstart Guide

> **Build, Ship, Shape: Amazon Developer Hackathon (2026)**  
> **Track:** Ring App Developer Primary Track  
> **Mini-Challenges:** AWS Builder + Open Source (`ring-partner-kit`)

---

## ⏱️ 3 Commands to Run

```bash
# 1. Install dependencies & open-source partner kit
pip install -r backend/requirements.txt
pip install -e ring-partner-kit

# 2. Run the automated test suite (47 passing tests)
python -m pytest

# 3. Launch the local interactive application
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```
Open **[http://localhost:8000/](http://localhost:8000/)** in any browser.

---

## 🎯 5 Clicks to Demo (Time-Travel Console)

The docked console at the bottom of the screen simulates the timeline for **Frank (78, Phoenix, AZ)** without requiring physical Ring hardware.

| Step | Action | What to Observe |
| :--- | :--- | :--- |
| **1. Normal Day** | Click **"Normal Morning Routine (08:50 AM)"** | Ingests 4 cryptographically signed Ring webhooks (wake, patio, meds, paper). Status card turns **Green (All Quiet & Well - L0)**. |
| **2. Routine Break** | Click **"Missed Morning Paper (09:45 AM, L1)"** | Frank completed kitchen and patio, but missed paper pickup. Window closes; engine triggers an **Amber L1 Alert** citing baseline evidence. |
| **3. Escalation** | Click **"Escalate to L2 (11:15 AM)"** | Simulates 90 minutes of silence without family acknowledgment. Ladder escalates to **L2 (Secondary Circle / Neighbor)**. |
| **4. Family Feedback** | Click **"I called Frank, all is well"** | Alert resolves as safe. The system automatically widens Frank's morning tolerance window by **+15 minutes** for the next 7 days. |
| **5. AI Assistant** | Open **Chat Drawer** (top right) & ask *"Did Dad get his paper today?"* | Bedrock Claude inspects the signal store via agentic tool-use, returning a calm, factual answer filtered by Bedrock Guardrails. |

*(Optional bonus: Click **"Reset to 07:00 AM"** anytime to reset the day to a clean morning state).*

---

## 🔍 Real vs. Simulated Reality Table

We believe technical honesty is essential for credible engineering evaluation:

| Component | Status | Reality & Architecture |
| :--- | :--- | :--- |
| **Ring Webhook Pipeline** | **Real Code** | Constant-time HMAC-SHA256 signature verification over unparsed raw bytes (`X-Signature` & `X-Ring-Signature`), timestamp drift replay protection (300s), and deduplication (`meta.request_id`). |
| **Ring Cloud Device Feed** | **Simulated** | As documented in [`FRICTION.md`](FRICTION.md), Ring Staging currently requires physical US-bound hardware with active subscriptions. We built `RingSim` ("Ring Twin") to emit byte-for-byte identical v1.1 JSON envelopes to test 100% of the ingestion pipeline. |
| **Statistical Baseline Engine** | **Real Code** | Gaussian Kernel Density Estimation (KDE) + Median Absolute Deviation (MAD) for automatic routine anchor discovery and dynamic tolerance bounds. Evaluated across 180 person-days in [`eval/harness.py`](eval/harness.py). |
| **Deterministic Escalator** | **Real Code** | Strict deterministic state machine (`L0 → L1 → L2 → L3`). **The LLM never decides when or whether to escalate.** |
| **Amazon Bedrock AI Narrator** | **Real + Fallback** | Bedrock Converse API with tool definitions (`get_today_status`, `get_recent_signals`). If AWS credentials are absent, an instantaneous deterministic fallback template is used. |
| **Bedrock Guardrails** | **Real Code** | Intercepts all AI drafts, blocking medical claims ("stroke", "heart attack") and alarmist phrases ("emergency", "call 911"). |
| **AWS Infrastructure** | **IaC Ready** | Fully specified in [`template.yaml`](template.yaml) (API Gateway HTTP API, DynamoDB single-table with TTL, Arm64 Lambdas, EventBridge 5-min cron, SES). |

---

## 🛡️ Core Differentiator: "Absence is the Signal"

Unlike conventional surveillance products, Quiet Check-In is designed for **elder dignity**:
1. 🚫 **Zero Video Streams (WHEP)**
2. 🚫 **Zero Audio Recording**
3. 🚫 **Zero Still Snapshots**
4. 🚫 **Zero Facial Recognition**
5. 🚫 **Zero Wearables to Remember**

When an elder goes about their day, ambient Ring sensors (doorbell dings, contact sensor open/close, hallway motion) naturally register activity. If an expected routine window passes in silence, the system gently escalates to family—explaining *why* with statistical evidence, never alarmism.
