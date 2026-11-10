# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Global Default Deny**: Any path not explicitly matched is denied (`allow read, write: if false;`).
2. **Identity & Ownership**: Every institutional record in `institutions`, `users`, `workspace_memberships`, `departments`, `documents`, `document_versions`, `knowledge_chunks`, `knowledge_articles`, `article_versions`, `workflow_runs`, `workflow_stages`, `review_tasks`, `lifecycle_proposals`, `conversations`, `chat_messages`, `unanswered_questions`, `audit_logs`, and `notifications` MUST have an `ownerId` matching `request.auth.uid` on creation and remaining immutable on update.
3. **Tenant & PII Isolation**: `users/{userId}` can only be read or written by the owner (`request.auth.uid == userId`) or a verified admin (`isAdmin()`). All `allow list` rules strictly enforce `resource.data.ownerId == request.auth.uid` without `get()` or `exists()` calls inside `list`.
4. **Strict Key & Size Validation**: Every write (`create` and `update`) invokes its entity validation helper `isValid[Entity](incoming())`, verifying key allowlists (`hasOnly`), required keys (`hasAll`), string `.size()` bounds, and ID regex (`^[a-zA-Z0-9_\-]+$`).

## 2. The "Dirty Dozen" Payloads

1. **Unauthenticated Write**: `auth = null` attempting `create` on `/institutions/inst_1` -> `PERMISSION_DENIED`.
2. **Identity Spoofing on Create**: `auth.uid = 'user_a'` creating `/documents/doc_1` with `ownerId: 'user_b'` -> `PERMISSION_DENIED`.
3. **Owner Mutation on Update**: `auth.uid = 'user_a'` updating `/documents/doc_1` to change `ownerId` to `'user_b'` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection**: Sending `isSuperAdmin: true` in `/users/user_a` payload -> Rejected by `data.keys().hasOnly(...)` -> `PERMISSION_DENIED`.
5. **Cross-Tenant List Scraping**: `auth.uid = 'user_a'` listing `/knowledge_articles` where `ownerId == 'user_b'` -> Rejected by `resource.data.ownerId == request.auth.uid` -> `PERMISSION_DENIED`.
6. **PII Leak on Users Collection**: `auth.uid = 'user_b'` calling `get` on `/users/user_a` -> `PERMISSION_DENIED`.
7. **Oversized String Denial-of-Wallet**: Sending a 500,000-char string in `title` on `/knowledge_articles/art_1` -> Rejected by `data.title.size() <= 300` -> `PERMISSION_DENIED`.
8. **ID Poisoning Attack**: Creating `/departments/invalid id with spaces!` -> Rejected by `isValidId()` -> `PERMISSION_DENIED`.
9. **Unverified Email Admin Spoof**: Attempting admin override with `email_verified: false` -> Rejected by `request.auth.token.email_verified == true` -> `PERMISSION_DENIED`.
10. **Audit Log Tampering (Update)**: Attempting to `update` an existing `/audit_logs/log_1` record -> `PERMISSION_DENIED` (audit logs are append-only).
11. **Value Poisoning on Update**: Updating `version` on `/documents/doc_1` with a string `"two"` instead of a `number` -> Rejected by `isValidDocumentRecord(incoming())` -> `PERMISSION_DENIED`.
12. **Unauthorized Admin Self-Promotion**: User attempting to write to `/admins/user_a` -> `PERMISSION_DENIED`.
