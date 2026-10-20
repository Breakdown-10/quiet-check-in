# Developer Friction Log: Quiet Check-In

**Hackathon:** Build, Ship, Shape: Amazon Developer Hackathon (2026)  
**Author:** Quiet Check-In Engineering Team  
**Focus Areas:** Ring Amazon Vision API, Developer Portal, Webhooks, AWS SDKs  
**Status:** Living Document (Maintained throughout the hackathon window)  

---

## Friction Entry #1: Requirement of Physical US Ring Device for Developer Staging Testing

* **Task Attempted:**  
  Set up end-to-end integration testing for a Ring App Store partner integration using synthetic / sandbox devices in the Amazon Developer Portal.
* **Steps Taken:**  
  1. Reviewed Ring Developer Portal documentation (`amazon_vision_api/dev_portal/develop.md`).
  2. Navigated to the "Testing" section in the portal.
  3. Attempted to find configuration for virtual or synthetic staging devices for partners outside the United States.
* **Expected vs. Actual Result:**  
  * *Expected:* A software-based sandbox or emulator in the Developer Portal allowing synthetic device provisioning (e.g., virtual Video Doorbell Pro) and programmatic event emission (similar to Alexa Skills test console or AWS LocalStack).
  * *Actual:* The portal documentation states: *"Only US Located Devices: Currently we only support devices located in the US."* and requires registering up to 10 staging users with physical hardware and active Ring Protection subscriptions.
* **Severity Rating:** **High** (Blocks international developers and teams without existing physical Ring hardware from validating the live cloud pipeline).
* **Workaround Used:**  
  Designed and built a dual-mode adapter architecture: `RingGateway` with `RingLive` (real Amazon Vision API endpoints) and `RingSim` ("Ring Twin" simulator). The simulator emits identical Ring v1.1 JSON payloads signed with the real HMAC-SHA256 key, ensuring 100% of the production verification, deduplication, and ingestion code path is exercised.
* **Actionable Suggestion:**  
  Introduce a cloud-hosted "Ring Developer Sandbox" endpoint where registered developers can create synthetic devices and trigger test webhook deliveries (e.g. `POST https://sandbox.api.amazonvision.com/v1/sandbox/trigger-event`) without requiring physical hardware bound to a US address.

---

## Friction Entry #2: Webhook HMAC Signature Calculation over Raw Byte Streams vs. Framework Parsing

* **Task Attempted:**  
  Verify Ring webhook authenticity in modern asynchronous Python web frameworks (FastAPI / Starlette) using `X-Signature: sha256=<hex_digest>`.
* **Steps Taken:**  
  1. Configured standard webhook route handler expecting parsed Pydantic payload models.
  2. Attempted to verify HMAC by re-serializing `payload.model_dump_json()`.
  3. Computed HMAC digest and compared with `X-Signature`.
* **Expected vs. Actual Result:**  
  * *Expected:* Re-serialized JSON with standard canonical formatting would match the signature.
  * *Actual:* Signature mismatch failure. Ring computes the HMAC over the exact unparsed byte stream transmitted across the HTTP connection. Any JSON re-serialization differences (key ordering, whitespace, float representations) invalidate the cryptographic digest.
* **Severity Rating:** **Medium** (Common developer pitfall causing silent 401 rejections).
* **Workaround Used:**  
  Extracted the unparsed request body directly via `await request.body()` before parsing the JSON payload. Implemented a dedicated `verify_ring_signature(raw_body: bytes, header: str, secret: str)` module utilizing constant-time `hmac.compare_digest`.
* **Actionable Suggestion:**  
  Add an explicit, prominent code snippet in the Ring Notifications documentation showing raw byte capture for major backend frameworks (Express `express.raw()`, FastAPI `await request.body()`, and Flask `request.get_data()`).

---

## Friction Entry #3: Contact Sensors Omitted from Event History API (Webhook-Only Delivery)

* **Task Attempted:**  
  Backfill past routines for door and contact sensors using the Ring Event History API (`GET /v1/history/devices/{id}/events`).
* **Steps Taken:**  
  1. Reviewed Event History documentation (`amazon_vision_api/event_history.md`).
  2. Attempted to query historical state changes for contact sensors (`contact_sensor_faulted`, `contact_sensor_cleared`).
* **Expected vs. Actual Result:**  
  * *Expected:* Event History would support all device types registered under `/v1/devices`, including contact sensors and environmental sensors.
  * *Actual:* Ring Event History only indexes `motion`, `on_demand`, and `ding` (doorbell) events. Sensor events are delivered exclusively via real-time webhooks and are completely unretrievable after the fact.
* **Severity Rating:** **Medium** (Prevents retrospective routine learning when an app is first installed; requires cold-start live observation).
* **Workaround Used:**  
  Architected our Ingestion layer to immediately persist every incoming sensor event upon receipt with zero-loss durability. In the Ring Twin simulator, added a dedicated history backfill generator that pre-seeds synthetic historical sensor signals.
* **Actionable Suggestion:**  
  Extend the Event History API to support sensor telemetry event types (`contact_sensor_faulted`, `contact_sensor_cleared`) with appropriate time-gated access.
