# Agent log (scratch — not part of the submission, becomes AGENT_USAGE.md source material)

Format per entry: what happened, what was wrong, why, what I did instead.

## Module 1 — Bootstrap
- create-next-app refused to scaffold directly into `/Volumes/Projects/Aggroso` because
  the directory name "Aggroso" contains a capital letter and npm package names must be
  lowercase. Worked around by scaffolding into a temp dir with a valid name
  (`nutrition-planner`) and moving the files into place, keeping `package.json`'s
  `name` field as `nutrition-planner`.
- create-next-app's default installed Next.js 16.2.12, but the spec locks the stack to
  Next.js 15. Pinned `next` and `eslint-config-next` to `15.5.22` explicitly after
  scaffolding rather than letting the default install stand.
