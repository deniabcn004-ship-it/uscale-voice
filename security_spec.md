# Security Specification - Algerian Dialect V

## 1. Data Invariants
1. **User Balance Integrity**: Users cannot update or increase their own credit balance (`credits`) or escalate their privileges (`isAdmin`). Only the Express server (using Admin access) or authenticated Admins can modify these fields.
2. **Identity Constancy**: The `userId` of any voiceover must match the authenticated user's `uid`.
3. **Secret Isolation**: System-wide configuration settings (such as the private Gemini API Key) must never be accessible to non-admin users.

## 2. Security Test Scenarios (The "Dirty Dozen" Payloads)

### Collection: `/users`
1. **Self-Escalation Attack**: User tries to set `isAdmin = true` on their own user profile. (Expected: `PERMISSION_DENIED`)
2. **Self-Crediting Attack**: User tries to increase their credit balance from 10 to 9999. (Expected: `PERMISSION_DENIED`)
3. **Identity Spoofing**: User tries to read another user's profile document. (Expected: `PERMISSION_DENIED`)
4. **Admin Scraping**: Non-admin user tries to query (list) all user accounts. (Expected: `PERMISSION_DENIED`)

### Collection: `/settings`
5. **Secret Sniffing**: Non-admin user tries to fetch `/settings/system` containing the API token. (Expected: `PERMISSION_DENIED`)
6. **Configuration Poisoning**: Non-admin user tries to update default credits to 0 or modify settings. (Expected: `PERMISSION_DENIED`)

### Collection: `/voiceovers`
7. **Recording Spoofing**: User tries to save a voiceover with another user's `userId` in the payload. (Expected: `PERMISSION_DENIED`)
8. **Archive Hijacking**: User tries to read a voiceover belonging to another user. (Expected: `PERMISSION_DENIED`)
9. **Archive Vandalism**: User tries to delete another user's voiceover. (Expected: `PERMISSION_DENIED`)
10. **Impersonation Update**: User tries to update an existing voiceover's `userId` to a different user. (Expected: `PERMISSION_DENIED`)

### Collection: `/admins`
11. **Admin Promotion**: Non-admin tries to register themselves in the `/admins` collection. (Expected: `PERMISSION_DENIED`)
12. **Admin Directory Scan**: Non-admin tries to list the `/admins` collection. (Expected: `PERMISSION_DENIED`)
