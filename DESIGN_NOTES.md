# TaskBoard Architectural Design Notes

This document details key architectural decisions and implementation strategies for Part 3b (Activity Feed) and Part 3c (Airtable Export).

---

## Part 3b — Activity Feed Transactional Rollback Policy

### Decision: Strict Atomic Transaction Rollback (`transaction.atomic()`)

When a meaningful project change occurs (task created, status changed, assignee updated, or comment added), an `ActivityLog` audit record is written.

**Choice & Reasoning:**
If writing the activity audit log fails (e.g. database constraint violation, disk error, or connection failure), the original state change **MUST roll back completely**.

1. **Audit Trail Integrity**: In enterprise project management tools, un-audited state changes create silent compliance and security risks. If a task status changes or a comment is posted without a corresponding audit log, the engagement history is corrupted.
2. **Data Consistency**: Wrapping both the domain change and the activity log creation in Django's `transaction.atomic()` guarantees ACID atomicity. Either both the state change and its audit record persist, or neither does.
3. **User Experience**: Rolling back prevents phantom state changes where an operation claims success but leaves no trace in the activity feed.

---

## Part 3c — Airtable Export Idempotency & Error Handling Strategy

### 1. Idempotency & Multiple Run Handling
To handle running exports repeatedly without creating duplicate task records in Airtable:
- Each task record in Airtable includes a primary `Task ID` field containing the task's unique UUID.
- Prior to pushing records, `export_tasks_to_airtable()` fetches existing records from Airtable and maps `{Task ID: record_id}`.
- If a matching `Task ID` exists, `table.update(record_id, fields)` is called; otherwise `table.create(fields)` is executed.

### 2. Failure Handling & Isolation
- **Transient Failures (HTTP 429 Rate Limits / 5xx Server Errors)**: Retried up to 3 times with exponential backoff (`sleep(2 ** attempt)`).
- **Permanent Failures (400 Bad Request / Invalid Field)**: Isolated per record. If an individual task record fails validation or schema mapping in Airtable, the exception is caught and logged, incrementing `failed_count` without aborting the rest of the batch.
- **Authorization**: Enforced at the API view level (`ExportView`), allowing only project `admin` or `member` roles to initiate exports (viewers and non-members receive HTTP 403).
