# Authentication & administration

## Roles

| Role | Can manage | Cannot |
| --- | --- | --- |
| **Super Admin** (Master Admin) | Every account: edit user info and permissions, promote customers to Admin, demote Admins, reset passwords, enable/disable MFA | Change its own role |
| **Admin** | Normal users (customers): edit, disable, reset password, enable/disable MFA | Manage, edit, reset or change the permissions/MFA of another Admin or the Super Admin |
| **Customer** (normal user) | Own account and security settings | Reach any admin surface |

The rules live in `src/features/auth/role-policy.ts` (pure, unit-tested) and are
enforced inside every server action — hiding the control in the UI is never the
boundary. A denied target answers exactly like a missing account
(`ROLE_NOT_PERMITTED_MESSAGE`), so the endpoints cannot be used to probe for
privileged accounts.

## MFA (per user)

Each account owns its factor (`User.mfaMethod`, `User.totpSecret`,
`User.mfaDisabledByAdminAt`):

- `AUTHENTICATOR` — TOTP secret generated per user, 10 recovery codes.
- `EMAIL_OTP` — a 6-digit code emailed at sign-in through the configured OTP
  sender.

Admins are always challenged at sign-in (email code by default); customers are
challenged only after enrolling. Self-service lives on
`/{locale}/account/security` and the admin **MFA** tab; both only ever act on
the signed-in user (the id comes from the session). Admins manage other users'
MFA from **Settings → Users → (user) → Security**. An admin switch-off sets a
lock the user cannot lift by re-enrolling.

## Password reset (all roles)

1. `POST /api/auth/forgot-password` (or the `requestPasswordResetAction` server
   action) mails a 6-digit code to the account's registered address.
2. `POST /api/auth/reset-password/verify` exchanges the code for a short-lived,
   single-use ticket.
3. `POST /api/auth/reset-password/complete` sets the password.

Every eligible role is served — the previous implementation only looked up
`role: "CUSTOMER"`, which is why admins never received mail. The response is
generic for known and unknown addresses. A successful reset revokes sessions,
clears MFA (the user enrolls again at next sign-in) and does not touch any other
account. Links mailed before this change still work once via
`POST /api/auth/reset-password`.

### Sender — one Email Account, every role

**Settings → Email Accounts → Email delivery** selects the one Email Account
used for all authentication mail: signup verification, email-code sign-in /
two-step codes, and password-reset codes. The setting lives with the accounts
it refers to and applies to **every** account type (customers, Admins and the
Super Admin).

- `resolveAuthEmailSender()` (→ `resolveAuthSender()` in
  `src/features/email/email-delivery.ts`) is the only resolver, so a flow cannot
  pick a different mailbox. It reads `accountSettings.emailDelivery.emailAccountId`.
- **Any administrator** may save it (`saveEmailDeliverySettingsAction`,
  `requireAdmin`). It is an operational setting, not a privilege: the sender
  belongs to the site, never to the admin who saved it.
- With no explicit choice, the only *sendable* Email Account is used. With
  several, nothing is sent until one is chosen — the admin screen says so and
  the failure is audited with its cause (`not_selected_multiple`, …).
- A selected-but-missing/incomplete account is an error, never a silent move to
  another mailbox. `RESEND_API_KEY` is a fallback **only** for sites with no
  Email Account at all.
- Upgrades: a site that still has the legacy `adminAuth.otpEmailAccountId`
  ("Admin account → Email delivery", now removed) keeps sending from that
  account; the value is read as the default until an admin saves Email delivery.

Every send (or its failure, with the resolved sender and cause) is recorded in
the security audit log: `auth.email_otp.sent|send_failed`,
`auth.password_reset.otp_sent|email_failed`, `auth.mfa.challenge|delivery_failed`.


## Database

`prisma/migrations/20261026140000_user_mfa_and_password_reset_otp` adds the MFA
columns and backfills existing authenticator enrollments. The OTP enum values
(`PASSWORD_RESET`, `LOGIN_MFA`) are in the schema too — see the migration
comment if Prisma reports the enum is already up to date.

## Tests

```bash
npm run test:auth:security   # new suites (policy, reset delivery, MFA isolation)
npm run test:auth            # existing suites (tsx)
```

`scripts/test/run-auth-tests.mjs` runs each suite in its own Node process with
`scripts/test/register.mjs`, which maps tsconfig paths and replaces the database,
mail transport and templates with in-memory doubles. No database is required.
