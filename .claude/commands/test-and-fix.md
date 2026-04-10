You are orchestrating an automated test-and-fix pipeline. Follow these steps exactly and in order.

---

## Step 1 — Run the tester agent

Use the `tester` subagent to audit the codebase (or the specific files mentioned in the arguments: $ARGUMENTS).

Tell it: "Analyze $ARGUMENTS for bugs and produce a full bug report."

If $ARGUMENTS is empty, tell it to scan all files under src/.

Wait for the tester to finish and collect its complete bug report.

---

## Step 2 — Evaluate the report

- If the report says `NO BUGS FOUND`, stop here and tell the user everything is clean.
- If bugs were found, continue to Step 3.

---

## Step 3 — Run the bug-fixer agent

Use the `bug-fixer` subagent. Pass it the complete bug report from Step 1, word for word.

Tell it: "Fix all bugs in this report: <paste full report here>"

Wait for the fixer to finish and collect its fix summary.

---

## Step 4 — Report to the user

Give a clean summary:

```
Pipeline complete.

BUGS FOUND: N
BUGS FIXED: N
SKIPPED: N

[List each fix with file and line]
```

If anything was skipped, explain why.
