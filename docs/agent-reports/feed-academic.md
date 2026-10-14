# Calendar include test isolation

The calendar subscription include tests were isolated from Bun's shared module and global state. The test-local storage adapter now handles deserializers and unavailable storage; calendar UI/auth/storage state is reset between tests; and unrelated pure recurrence tests no longer install persistent API mocks.

## Validation tails

```text
cd apps/web && bun test src

 837 pass
 1 skip
 0 fail
 26268 expect() calls
Ran 838 tests across 104 files. [58.49s]
```

```text
cd apps/web && bun test src

 837 pass
 1 skip
 0 fail
 26268 expect() calls
Ran 838 tests across 104 files. [46.40s]
```

```text
cd apps/web && bun test src/components/Timetable src/lib/calendar-subscription

 36 pass
 0 fail
 90 expect() calls
Ran 36 tests across 4 files. [2.94s]
```

```text
cd apps/web && bunx tsc --noEmit

tsc exit=0
```

```text
cd apps/web && bun test src/dictionaries

 11 pass
 0 fail
 22809 expect() calls
Ran 11 tests across 2 files. [2.31s]
```
