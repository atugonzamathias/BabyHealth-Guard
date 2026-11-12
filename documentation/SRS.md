# Software Requirements Specification

## BabyHealth Guard

**Document ID:** BHG-SRS-001  
**Version:** 1.0  
**Status:** Proposed requirements baseline — stakeholder and clinical review required  
**Prepared:** 11 November 2026  
**System:** Digital maternal and newborn health monitoring platform

> This specification defines the intended product requirements. It is not evidence that a requirement has already been implemented, clinically approved, or legally certified. Proposed service levels and operating assumptions must be confirmed before production acceptance.

## Document control

| Version | Date | Change |
|---|---|---|
| 1.0 | 11 November 2026 | Initial repository-informed SRS; separates current implementation from proposed target capabilities. |

### Review and approval

This SRS should be reviewed and approved by the product owner, representative mothers, clinical safety lead, facility representatives, privacy/data-protection lead, security lead, and delivery/operations lead. Approval requires resolution or explicit acceptance of the open decisions in Section 15. Clinical thresholds, messages, and escalation pathways require documented approval by qualified local clinical authorities.

## 1. Purpose and conventions

This Software Requirements Specification (SRS) establishes the functional, interface, data, safety, security, and quality requirements for BabyHealth Guard. It is intended to provide a testable baseline for product design, implementation, procurement, integration, verification, and acceptance.

The structure and requirement quality practices are informed by ISO/IEC/IEEE 29148:2018. Quality characteristics are organized with reference to ISO/IEC 25010:2023. This document does not claim certification or conformance to either standard.

The terms **shall**, **should**, and **may** express mandatory, recommended, and optional requirements respectively. Each requirement has a stable identifier and is intended to be singular, necessary, feasible, and verifiable. Requirements marked **P0** are release-critical; **P1** are required for the initial complete service; **P2** are later or optional. Proposed quantitative targets are subject to approval before the release baseline is frozen.

## 2. Product context

BabyHealth Guard is intended to support maternal and newborn care in communities where access to facilities, smartphones, and reliable internet may be constrained. Its intended channels are:

1. A Flutter mobile application for mothers and, where authorized, assisted capture.
2. A browser-based web dashboard for healthcare workers and administrators.
3. A centralized API and persistent data store.
4. Planned SMS and USSD gateway integrations for users without smartphones or dependable data connectivity.

The product records and presents health information, visit schedules, follow-up status, and clinically approved decision-support alerts. It is not an autonomous diagnostic, triage, or treatment system. A qualified health professional remains responsible for clinical interpretation and care decisions.

### 2.1 Repository baseline observed

At the time this specification was prepared, the repository contains:

- A Java 21 / Spring Boot 3.3 API with authentication, mother records, maternal vital-sign records, and appointment endpoints; PostgreSQL is configured, and H2 is a declared runtime dependency.
- A vanilla JavaScript dashboard that calls selected authentication, mother, vital, and appointment endpoints but also contains in-memory/demo content.
- A Flutter welcome, registration, and mother dashboard flow with health check screens and call/SMS link launch actions.
- A project proposal describing broader mobile, web, SMS/USSD, offline, newborn, alert, follow-up, and reporting capabilities.

The mobile screens are not currently integrated with the backend; the mobile profile save and displayed health data are local/demo state. The repository does not evidence an operational SMS or USSD gateway, durable offline synchronization, newborn API workflows, clinical alert workflow, automated reminder delivery, or report generation. The interface's "Works offline"/USSD indicators and SMS status text are not proof those services are connected. These capabilities are specified below as target requirements and must be implemented and verified before being represented as available to users.

The source proposal identifies Uganda as the initial market, while repository examples include Kenyan phone numbers and Uganda-specific mobile UI details. The deployment jurisdiction and authoritative care pathways are unresolved.

## 3. Scope

### 3.1 In scope

- Mother, newborn, user, and facility profile management.
- Authentication, role- and facility-scoped authorization, and auditable access.
- Maternal pregnancy information and time-stamped maternal vital-sign records.
- Newborn health and growth records linked to the mother.
- Appointment scheduling, status tracking, reminders, and missed-visit follow-up.
- Clinically governed alerts and healthcare-worker follow-up.
- Mother mobile experience and healthcare-worker web dashboard.
- Secure API, persistence, synchronization, operational logging, and backups.
- Planned SMS and USSD access, contingent on supported gateway and local carrier arrangements.
- Basic operational reports using authorized, appropriately scoped data.

### 3.2 Out of scope for the initial release

- Autonomous diagnosis, treatment recommendations, or replacement of professional care.
- AI/image-based screening, predictive risk scoring, or automated clinical triage.
- Direct medical-device/IoT integrations.
- Payments, insurance processing, and commercial analytics.
- Cross-border record exchange or multi-country regulatory certification.
- Emergency dispatch or guaranteed emergency-response service.

These items require separate product, clinical, legal, privacy, and safety approval before being added to scope.

## 4. Stakeholders and user classes

| User class | Goals and authorized needs |
|---|---|
| Mother / expectant mother / new mother | View her own profile and care information; submit permitted health entries; see appointments and approved education; use supported contact and alert actions. |
| Healthcare worker / community health worker | Register or update permitted patients; record care information; review assigned/facility records; manage appointments and follow-up. |
| Nurse / midwife / clinician | Review clinical history and alerts within assigned scope; document professional follow-up and care decisions. |
| Facility administrator | Manage facility users and operational configuration; view facility-scoped dashboards and reports. |
| System operator | Maintain the service, integrations, backups, and technical health without unnecessary access to clinical content. |
| Clinical safety authority | Approve clinical content, alert rules, escalation guidance, and change control. |
| Privacy/data-protection lead | Define lawful basis, notices/consent, retention, access, disclosure, and data-subject handling for each jurisdiction. |

The roles and permissions above are target behavior. Actual permissions, eligibility, delegation, and user identity proofing require stakeholder approval.

## 5. Operating environment and constraints

- The mobile client is Flutter/Dart, with Android as the documented primary target; minimum supported OS and device profile must be selected for pilot deployment.
- The web client is browser-based and is currently served as static content by the backend.
- The backend is a Java 21 / Spring Boot REST application. PostgreSQL is the configured database target; database topology and production hosting are not yet defined.
- Basic-phone access depends on an external SMS/USSD aggregator, participating mobile network operators, approved short code/service code, and reliable delivery callbacks.
- Mobile connectivity can be intermittent. Offline behavior must not be claimed until local persistence, encryption, retry, conflict handling, and sync verification are implemented.
- The intended initial market is described as Uganda in the proposal, but sample data/configuration conflicts with that assumption. Jurisdiction, language, phone format, emergency contacts, clinical content, and legal duties must be resolved before pilot use.
- Health data is sensitive. Development seed accounts, sample patient records, and default credentials are for local demonstration only and shall never be used in a production deployment.

## 6. Assumptions and dependencies

1. Participating facilities will identify authorized users, facility boundaries, clinical owners, and patient registration procedures.
2. Qualified local clinical authorities will supply, approve, version, and maintain care education, alert rules, emergency wording, and referral contacts.
3. A legal/privacy assessment will establish applicable data-protection, health-record, consent, retention, residency, and breach-notification obligations.
4. SMS/USSD delivery depends on carrier coverage, aggregator availability, message throughput, sender registration, user number quality, and service agreements; delivery cannot be guaranteed by the application alone.
5. Mothers can be identified and linked to their records using an approved registration and duplicate-resolution process.
6. Users will receive appropriate notice and, where required, provide informed consent before collection or messaging.
7. Reminder timing, local time zones, languages, and opt-out policy will be agreed with clinical and operational stakeholders.

## 7. System interfaces

### 7.1 User interfaces

- **Mobile:** onboarding, registration/profile, health dashboard, record entry, visit details, warning signs, contact actions, and offline/sync status. Screen-reader labels, scalable text, low-literacy presentation, clear error recovery, and low-bandwidth operation are required.
- **Web dashboard:** secure sign-in; facility-scoped patient list/search; mother and newborn records; vital history; appointments; alerts/follow-up queue; and authorized reports.
- **SMS:** explicit consent/notice, supported message commands, reminders and confirmations, delivery status, privacy-safe message content, and user support/opt-out where legally and operationally appropriate.
- **USSD:** short, localized, time-bounded interactive sessions; input validation; safe timeout behavior; confirmation only after durable save; and no exposure of sensitive information on shared devices beyond what the approved threat and privacy assessment permits.

### 7.2 Software and service interfaces

- **REST API:** authenticated JSON over HTTPS. The API shall publish a versioned contract, validation/error model, authorization behavior, and documented endpoints. Breaking changes shall be versioned and communicated.
- **Database:** PostgreSQL in production target; durable migrations, integrity constraints, backup and restore, and least-privilege database access are required.
- **SMS/USSD provider:** adapter boundary for provider-specific requests, signature/authentication validation, idempotent callbacks, delivery receipts, timeout handling, and secret rotation.
- **Mobile platform services:** camera/gallery access is optional and permission-gated; telephone/SMS launcher actions require user initiation and shall not imply that a call or message was completed.

## 8. Functional requirements

Each requirement below is part of the target system specification, not a statement of current implementation. Unless stated otherwise, successful writes shall be persisted and associated with an authenticated actor, the applicable person, facility, and timestamp.

### 8.1 Identity, access, and consent

| ID | Priority | Requirement |
|---|---|---|
| FR-001 | P0 | The system shall authenticate each staff and mother account using an approved credential or identity mechanism before granting access to non-public personal or health information. |
| FR-002 | P0 | The system shall authorize each API and user-interface action against the authenticated user's role, facility assignment, record relationship, and active account status; hiding a control alone shall not constitute authorization. |
| FR-003 | P0 | The system shall support approved roles for mothers, healthcare workers, clinicians, facility administrators, and system operators, with least-privilege permissions defined in a reviewed access-control matrix. |
| FR-004 | P0 | The system shall allow authorized users to create, view, and update identity and facility profiles, and shall prevent unauthorized or duplicate registration according to an approved matching and resolution policy. |
| FR-005 | P0 | The system shall record applicable notice/consent state, version, purpose, time, and capture channel before optional processing such as messaging or profile-photo collection. |
| FR-006 | P1 | The system shall support credential reset, session expiry, logout/revocation, and account disablement without disclosing whether an unrelated account exists. |

### 8.2 Maternal and newborn records

| ID | Priority | Requirement |
|---|---|---|
| FR-007 | P0 | The system shall create a maternal profile containing the minimum approved demographic, contact, facility, and pregnancy-care data, with required fields and formats configured by deployment jurisdiction. |
| FR-008 | P0 | The system shall allow authorized users to view and update a maternal profile and shall retain a timestamped history of material clinical-data changes. |
| FR-009 | P1 | The system shall record pregnancy-related information, including only fields defined and approved by the clinical owner, with source, effective time, and entry time where these differ. |
| FR-010 | P0 | The system shall record maternal blood pressure and weight as typed values with units, valid ranges, measurement time, recorder, and provenance; invalid or incomplete values shall be rejected with actionable feedback. |
| FR-011 | P1 | The system shall associate each newborn profile with exactly one maternal record at creation and support approved corrections to that association with an audit trail. |
| FR-012 | P1 | The system shall record approved newborn health, growth, feeding, and immunization information with units, observation time, recorder, and validation rules defined by clinical governance. |
| FR-013 | P0 | The system shall display a chronological maternal/newborn record history to users authorized for the relevant record and facility. |
| FR-014 | P1 | The system shall allow a mother to access only her own approved profile and records after an identity-to-record association has been verified. |

### 8.3 Appointments and notifications

| ID | Priority | Requirement |
|---|---|---|
| FR-015 | P0 | An authorized mother or healthcare worker shall be able to schedule an appointment linked to a mother, facility, type, local date/time, and status. |
| FR-016 | P1 | The system shall support the approved visit types, including antenatal, delivery-related, postnatal, and immunization, without treating appointment data as a clinical diagnosis. |
| FR-017 | P0 | An authorized user shall be able to reschedule or cancel an appointment and record attendance, missed, or other approved status with actor and timestamp. |
| FR-018 | P1 | The system shall create reminders according to a configurable, approved schedule and channel preference, and shall prevent duplicate sends for the same appointment/reminder occurrence. |
| FR-019 | P1 | The system shall record notification request, provider response, delivery status when available, retry outcome, and failure reason; it shall not represent a queued or failed message as delivered. |
| FR-020 | P1 | The system shall notify the appropriate user of an appointment change or cancellation through the configured channel, subject to consent, provider availability, and delivery-status reporting. |
| FR-021 | P1 | The system shall identify appointments requiring follow-up using approved status and timing rules and present them to authorized healthcare workers. |

### 8.4 Clinically governed alerts and follow-up

| ID | Priority | Requirement |
|---|---|---|
| FR-022 | P0 | The system shall evaluate submitted information only against a clinically approved, versioned set of alert rules enabled for the deployment. |
| FR-023 | P0 | When an approved rule matches, the system shall create an alert containing the triggering record, rule/version, creation time, severity/urgency as approved, and required user-facing safety message. |
| FR-024 | P0 | The system shall present alerts to authorized healthcare workers and provide a safe, clinically approved instruction to seek professional care where indicated; the system shall not diagnose or prescribe. |
| FR-025 | P1 | An authorized healthcare worker shall be able to document contact attempts, review, actions, disposition, and closure/reopen status for each alert, with actor and time. |
| FR-026 | P1 | The system shall retain an auditable history of alert creation, rule version, review, escalation, and closure; rule changes shall not silently reclassify prior alerts. |

### 8.5 Mobile, offline, SMS, and USSD

| ID | Priority | Requirement |
|---|---|---|
| FR-027 | P0 | The mobile application shall clearly distinguish locally saved, pending synchronization, synchronized, and rejected records and shall not claim remote persistence until the server confirms the write. |
| FR-028 | P1 | The mobile application shall encrypt locally stored personal and health information, preserve queued entries across restart, retry synchronization after connectivity returns, and prevent duplicate server records on retry. |
| FR-029 | P1 | The synchronization process shall report validation errors and conflicts without silently overwriting a server or user value; conflict resolution rules shall be approved for each record type. |
| FR-030 | P1 | The system shall provide an SMS service for approved reminders and user-initiated communications through a configured provider, with delivery status and failure handling. |
| FR-031 | P1 | The system shall provide a USSD menu for approved registration/check-in, appointment, and health-information workflows through a configured gateway and supported carrier code. |
| FR-032 | P1 | SMS and USSD workflows shall validate caller/session identity and input, bind submissions to the correct patient, and avoid confirming a record until it is durably accepted. |
| FR-033 | P1 | When a USSD session times out or a gateway request is repeated, the system shall safely end or resume the interaction without duplicate writes or misleading success messages. |
| FR-034 | P0 | The system shall present emergency contact and danger-sign information only after local clinical approval, shall identify the configured jurisdiction, and shall make clear that the app is not an emergency dispatch service. |

### 8.6 Dashboard, search, reports, and operations

| ID | Priority | Requirement |
|---|---|---|
| FR-035 | P0 | The web dashboard shall display facility-scoped patients, recent authorized health entries, upcoming/missed appointments, and open alerts according to the user's permissions. |
| FR-036 | P1 | Authorized users shall be able to search patient records using approved identifiers and permitted fields without exposing matches outside their authorization scope. |
| FR-037 | P1 | The system shall generate basic patient/facility reports from a defined, date-bounded dataset and shall enforce access scope, data minimization, and approved export controls. |
| FR-038 | P0 | The system shall record security- and clinical-relevant events, including authentication outcomes, access to sensitive records, changes, exports, and administrative actions, with actor, time, target, and outcome. |
| FR-039 | P1 | Administrators shall be able to manage facility users and approved operational settings without changing or deleting clinical history outside their authorization. |
| FR-040 | P1 | The system shall provide operational status for configured SMS/USSD integrations, synchronization, background reminder processing, and failed jobs to authorized operators. |

## 9. Data requirements and business rules

### 9.1 Core entities

| Entity | Minimum conceptual data |
|---|---|
| User | Stable identifier, authentication reference, role, active state, facility scope, timestamps. |
| Mother | Stable identifier, approved demographic/contact fields, facility, linked user where applicable, consent/notice references. |
| Newborn | Stable identifier, maternal link, approved birth/profile fields, timestamps. |
| Health observation | Person/record link, observation type, value, unit, effective and recorded time, source, recorder, validation state. |
| Appointment | Mother, facility, type, local scheduled time/time zone, status, status history, created/updated actor and times. |
| Alert/follow-up | Trigger reference, approved rule and version, urgency, lifecycle state, assigned facility/worker, action history. |
| Notification | Recipient/channel, purpose, consent basis, request time, provider reference, status, failure/retry history. |
| Audit event | Actor/service, action, target, time, outcome, correlation identifier, minimum necessary metadata. |

### 9.2 Data rules

- Every entity shall have a stable, non-reused identifier. Relationships shall be validated and protected by database constraints where appropriate.
- Timestamps shall be stored unambiguously (UTC instant) and rendered in the configured facility/user time zone. The original local appointment time and zone shall be retained where necessary to prevent daylight-saving or offset ambiguity.
- Measurement values shall include explicit units and clinically governed validation ranges. A plausibility warning shall not be silently substituted for the original observation.
- Patient merge, deletion, correction, and retention behavior shall follow an approved legal and clinical policy; clinical history shall not be silently erased.
- The system shall not store real patient data in demo fixtures, logs, test snapshots, or analytics outputs without an approved lawful basis and safeguards.
- Reports and exports shall include generation time, scope, filters, and creator and shall not disclose data outside the creator's authorization.

## 10. External interface requirements

- All production client/server and provider callbacks shall use HTTPS with TLS 1.2 or higher; stronger versions shall be used where supported.
- Authentication and authorization failures shall use consistent machine-readable error responses and shall not reveal sensitive record existence.
- API requests that can be retried shall support idempotency or equivalent duplicate protection, especially for health observations, reminders, callbacks, and synchronization.
- API input shall be validated on the server for format, required values, allowed enumerations, bounds, and record ownership/scope. Client-side checks are supplementary.
- Provider callbacks shall be authenticated using the provider's recommended signed request mechanism or equivalent verified secret, with replay protection.
- The dashboard and mobile client shall expose loading, empty, offline, permission-denied, validation, and server-failure states distinctly.

## 11. Non-functional requirements

These are proposed acceptance targets for a production pilot. They require confirmation against available budget, hosting, devices, and operating model.

| ID | Quality | Requirement / acceptance target |
|---|---|---|
| NFR-001 | Performance | Under the agreed pilot load (initial target: 100 concurrent interactive users and 10,000 active maternal profiles), at least 95% of ordinary API reads/writes shall complete within 2 seconds and 99% within 5 seconds, excluding external provider latency. |
| NFR-002 | Availability | The production service shall achieve at least 99.5% monthly availability, excluding pre-announced maintenance, measured at the public API and dashboard entry point. |
| NFR-003 | Reliability | A confirmed server write shall survive application restart and normal process failure; no acknowledged record may be lost in acceptance tests. |
| NFR-004 | Recovery | Production backup and restore shall be tested; proposed initial recovery targets are RPO no greater than 24 hours and RTO no greater than 8 hours, pending operational approval. |
| NFR-005 | Security | Production traffic shall be encrypted in transit; stored sensitive data and device-local health records shall be encrypted at rest using managed, appropriately protected keys. |
| NFR-006 | Security | The system shall enforce least privilege, facility/record-level authorization, secure session expiry/revocation, rate limiting for authentication and public gateways, and secret rotation. |
| NFR-007 | Security | Passwords shall be stored using a contemporary adaptive password-hashing scheme with unique salts and deployment-approved parameters; reversible storage and plaintext credentials are prohibited. |
| NFR-008 | Security | Security verification shall include threat modeling and testing against applicable OWASP ASVS controls for the web/API and OWASP MASVS controls for mobile before production release; unresolved critical/high findings block release. |
| NFR-009 | Privacy | Collection, use, disclosure, retention, and deletion shall be purpose-limited and lawful for the selected jurisdiction; data-subject request and breach-response procedures shall be defined before pilot operation. |
| NFR-010 | Auditability | Audit events shall be access-controlled, time-synchronized, tamper-evident to the extent supported by the deployment, and retained according to the approved retention schedule; secrets and unnecessary clinical content shall not be logged. |
| NFR-011 | Usability | At least 90% of representative pilot users shall complete each agreed critical task without moderator intervention in usability acceptance testing; test participants shall include low digital-literacy users. |
| NFR-012 | Accessibility | Web and mobile interfaces shall target WCAG 2.2 AA principles, including keyboard/screen-reader operation where applicable, text scaling, contrast, focus visibility, and actionable error text. |
| NFR-013 | Offline resilience | For supported offline workflows, 100% of valid queued test records shall remain available after app restart and synchronize exactly once after connectivity restoration; failed/conflicting records shall be visibly reported. |
| NFR-014 | Compatibility | The release shall publish a tested device/OS/browser support matrix. The initial proposed mobile target is supported Android versions covering at least 90% of pilot devices, verified with facility/user device discovery before selection. |
| NFR-015 | Interoperability | API contracts shall be versioned, documented, and backward-compatible within a major version; date-time, units, and enumerations shall be explicit and consistent. |
| NFR-016 | Maintainability | Automated tests shall cover core domain validation, authorization boundaries, data persistence, and critical user workflows; production releases shall be reproducible from versioned source and migration scripts. |
| NFR-017 | Observability | The service shall expose health/readiness checks, structured operational logs, metrics for latency/errors/queue age/provider outcomes, and actionable alerts without exposing protected health information. |
| NFR-018 | Localization | User-visible text, date/time, phone number formatting, emergency contacts, and clinical content shall be configurable by approved locale; no hard-coded country-specific clinical claim shall be deployed across jurisdictions. |
| NFR-019 | Scalability | The system shall scale to the agreed next-stage target by adding application capacity without changing clinical data semantics; pilot load and growth assumptions shall be benchmarked before acceptance. |
| NFR-020 | Data integrity | Database and application validation shall prevent orphaned records, invalid status transitions, duplicate retry submissions, and cross-facility access; integrity checks shall be included in release testing. |

## 12. Safety, security, and privacy controls

1. **Clinical governance:** Every alert threshold, education message, symptom instruction, reminder, and emergency contact shall have an accountable clinical owner, source, jurisdiction, approval date, review date, and version.
2. **No diagnosis:** The product shall not claim to diagnose, rule out danger, recommend treatment, or guarantee a clinical outcome. Alert absence shall never be presented as evidence that mother or newborn is safe.
3. **Human oversight:** A clinician shall approve rules before activation and review alert performance after deployment. Rule changes shall be reviewed, tested, approved, versioned, and reversible.
4. **Emergency wording:** Urgent guidance shall direct users to the locally approved care pathway and clearly state service limitations. A call/SMS launch action is not confirmation of connection or dispatch.
5. **Authorization:** Every protected API operation shall be tested for role, facility, ownership, disabled-account, and direct-object-reference bypasses.
6. **Secure operations:** Production credentials and cryptographic keys shall come from a managed secret store or equivalent protected configuration; default/demo credentials shall be removed or disabled.
7. **Privacy by design:** The deployment shall define lawful basis/consent, minimum data set, access roles, retention/deletion, patient rights, vendor agreements, breach notification, and any data residency constraints before live data is loaded.
8. **Incident response:** Operators shall have documented procedures for suspected data breach, compromised account, provider outage, failed alert/reminder jobs, restore, and clinical safety incidents.

## 13. Acceptance and verification approach

Each requirement shall be mapped to one or more verification cases before release. Verification methods are inspection (I), analysis (A), demonstration (D), and test (T).

| Area | Minimum acceptance evidence |
|---|---|
| Authentication/authorization | Automated positive and negative tests for every role and facility boundary, including unauthenticated access and direct API requests. |
| Patient and newborn records | Validation, ownership, required fields, audit history, relational integrity, and duplicate-resolution tests. |
| Vital records and alerts | Approved clinical examples, boundary values, rule version checks, no-diagnosis wording review, and clinician sign-off. |
| Appointment/reminders | Time-zone, schedule-change, duplicate-retry, failure receipt, and status-transition tests; provider sandbox evidence for integration. |
| Offline synchronization | Airplane-mode capture, app restart, retry, duplicate delivery, server conflict, rejection, and recovery test with zero silent data loss. |
| SMS/USSD | Gateway sandbox/production-like end-to-end flows, identity binding, signed callbacks, timeout/replay tests, language and privacy review. |
| Dashboard/reporting | Facility-scope tests, record search, report filter correctness, export authorization, and privacy review. |
| Performance/recovery | Repeatable load test against the agreed baseline and witnessed backup/restore test meeting approved NFR targets. |
| Accessibility/usability | WCAG-oriented automated/manual review plus observed task testing with representative users and documented remediation. |
| Release security | Threat model, dependency review, OWASP-aligned tests, remediation evidence, secret/configuration review, and incident-response readiness. |

A release is acceptable only when all P0 requirements pass, P1 scope is either passed or formally deferred with an owner and date, clinical/privacy/security sign-offs are recorded, and no open critical/high risk blocks remain.

## 14. Traceability

| Proposal objective / current product area | SRS requirements |
|---|---|
| User registration and role access (proposal FR01, FR02, FR14) | FR-001–FR-006, FR-007–FR-008, FR-035, FR-039 |
| Maternal health and vital records (FR03, FR04) | FR-009–FR-010, FR-013–FR-014 |
| Newborn health and growth (FR05) | FR-011–FR-013 |
| Appointments and reminders (FR06, FR07) | FR-015–FR-021 |
| SMS and USSD access (FR08) | FR-030–FR-033 |
| Clinical alerts and follow-up (FR09, FR11) | FR-022–FR-026 |
| Monitoring dashboard and reporting (FR10, FR12) | FR-035–FR-037 |
| Offline capture/synchronization (FR13) | FR-027–FR-029, NFR-013 |
| Security, privacy, data integrity, and quality | FR-002, FR-005–FR-006, FR-038, NFR-001–NFR-020 |

The proposal's original FR numbers are retained here only as traceability references; the uniquely testable statements in Section 8 are the proposed acceptance baseline.

## 15. Open decisions and risks

The following must be resolved by accountable stakeholders before requirements are baselined for live deployment:

1. **Jurisdiction and regulatory scope:** Confirm launch country (proposal: Uganda; code/demo data includes Kenya) and applicable health-data, privacy, hosting, retention, child/newborn, and cross-border rules.
2. **Clinical ownership:** Name approving authority and provide validated maternal/newborn thresholds, symptom wording, escalation steps, emergency contacts, review cadence, and rollback process.
3. **Identity and consent:** Define mother/staff verification, guardian/newborn representation, consent/notice, shared-phone privacy, messaging opt-in/out, and assisted registration.
4. **Facilities and tenancy:** Define facility hierarchy, patient transfer, staff assignment, administrator privileges, and whether cross-facility clinical access is ever allowed.
5. **Mobile operation:** Confirm Android versions/devices, supported offline workflows, local encryption/key protection, data expiry on shared/lost phones, and sync conflict policies.
6. **SMS/USSD operations:** Select provider/carriers, service code, languages, payload limits, identity verification, cost ownership, delivery SLAs, retry, and outage support.
7. **Notifications:** Confirm reminder offsets, channels, content, quiet hours, timezone, failed delivery action, and whether sensitive details may appear in messages.
8. **Service levels:** Approve pilot load, monthly availability, RPO/RTO, support hours, maintenance windows, hosting/residency, and incident escalation.
9. **Reports and retention:** Approve exact reports, export formats, de-identification rules, access approvals, retention period, and deletion/legal-hold policy.
10. **Product readiness:** Replace hard-coded demo identities, patient data, contact numbers, sample dates, and UI claims before any production or patient-facing deployment.

Key risks include misleading clinical reassurance, wrong-patient association, unauthorized cross-facility disclosure, duplicate or lost offline records, SMS/USSD failures, shared-device exposure, and unsupported local emergency information. Each risk requires an owner, mitigation, and release evidence in the project risk register.

## 16. Glossary

| Term | Meaning |
|---|---|
| ANC | Antenatal care. |
| API | Application programming interface. |
| Facility scope | The healthcare facility or approved set of facilities whose records a user may access. |
| Health observation | A time-stamped maternal or newborn measurement, symptom report, or other approved clinical data item. |
| Idempotency | Processing the same retried operation more than once without creating duplicate effects. |
| Mother | An expectant mother or mother receiving postnatal care. |
| Newborn | A child record linked to a maternal record, subject to locally defined age and legal rules. |
| P0/P1/P2 | Release-critical, initial-release, and later/optional priority. |
| USSD | Unstructured Supplementary Service Data, a carrier-operated interactive mobile service. |

## 17. References

- ISO/IEC/IEEE 29148:2018, *Systems and software engineering — Life cycle processes — Requirements engineering*.
- ISO/IEC 25010:2023, *Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — Product quality model*.
- ISO 14971:2019, *Medical devices — Application of risk management to medical devices* — use as a safety-risk-management reference where applicability is determined by the product's intended purpose and jurisdiction; this reference does not classify the system as a medical device.
- IEC 62304:2006+A1:2015, *Medical device software — Software life cycle processes* — applicability to be determined by regulatory assessment.
- OWASP Application Security Verification Standard (ASVS) and OWASP Mobile Application Security Verification Standard (MASVS), current versions at implementation and release.
- W3C Web Content Accessibility Guidelines (WCAG) 2.2.
- BabyHealth Guard project proposal: *A Digital Maternal and Newborn Health Monitoring System with SMS and USSD Integration for Rural Communities*.
