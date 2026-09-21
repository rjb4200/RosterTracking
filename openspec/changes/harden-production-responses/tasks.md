## 1. Header set

- [x] 1.1 Add a security-headers module that returns the documented header set for a given environment
- [x] 1.2 Include the content security policy, strict transport security, frame-ancestors restriction, nosniff restriction, referrer policy, and permissions policy
- [x] 1.3 Add the development-only allowances (`'unsafe-eval'` and websocket connections) so HMR keeps working while production stays tighter
- [x] 1.4 Apply the header set to every route from `next.config.ts`
- [x] 1.5 Confirm framework and server version disclosure remains disabled

## 2. Verification

- [x] 2.1 Unit-test the header set for both production and development, pinning the difference between them
- [x] 2.2 Add an end-to-end check that a public response and a staff response both carry the headers
- [x] 2.3 Exercise staff sign-in, the class page, and public student sign-in against the policy and resolve every violation
- [x] 2.4 Run `npm run check`, `npm run test`, the integration suite, and `npm run build`
- [x] 2.5 Run the browser suite against a production build with `E2E_PRODUCTION=1`
