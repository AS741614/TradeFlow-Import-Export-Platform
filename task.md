# Task Checklist - Prompt 9a (Storage Layer Migration)

- [x] 1. Create `src/lib/api-client.ts` fetch client and `StorageError` class
- [x] 2. Create `src/lib/__tests__/api-client.test.ts` unit tests
- [x] 3. Run unit tests for api-client and verify they pass (`npm test`)
- [x] 4. Rewrite `src/lib/storage.ts` to use `ApiClient` and return Promises
- [x] 5. Rewrite `src/lib/__tests__/storage.test.ts` to mock fetch instead of localStorage
- [x] 5a. Rewrite `src/lib/email.ts` campaign simulation to be Promise-based/async
- [x] 5b. Rewrite `src/lib/__tests__/email.test.ts` to mock fetch and handle async
- [x] 6. Update `.env.example` with `NEXT_PUBLIC_BASE_URL`
- [x] 7. Update `README.md` and `AGENTS.md` to reflect new async architecture
- [x] 8. Append `tsc-9a-errors.log` to `.gitignore` and verify it is check-ignored
- [x] 9. Run tsc and capture component type errors into `tsc-9a-errors.log`
- [x] 10. Run ESLint checks and unit tests to ensure they are green
- [x] 11. Run production build, capture failure details for Prompt 9b
- [x] 12. List setItems call sites for Prompt 9b planning
- [x] 13. Commit changes under Conventional Commits
