# WordSpell — agent development contract

## Goal and authority

Build a touch-first English storybook game, not a learning-platform shell. Read README.md, docs/STATUS.md, docs/README.md and the assigned work package before modifying code. Product and gameplay: docs/01 and docs/02. Runtime contracts: docs/04 and docs/05. Report conflicts; update the authoritative document with the implementation instead of copying a competing specification.

Current target: WP-GAMEPLAY-CORE-04 scene-driven adventure. This story uses three acts and six words, not global product limits; the legacy twelve challenges/thirteen steps no longer drive the formal page. Preserve the actual map → mat → place across ink → map chain. Full-game readiness requires actual interaction, reviewed content and device evidence, not type declarations or mock tests.

## Engineering constraints

- One React / TypeScript / Vite application; one deterministic domain transition path. Do not add microservices, a generic workflow platform, ECS, physics engine, ORM or a global event bus without a concrete requirement.
- Keep domain code independent of React, DOM, storage, audio and providers. UI emits commands; domain state drives rendering. Never decide correctness with an LLM.
- Preserve entity identity on transformation. Protect the companion cat from transformation; cat-card is a separate token. Reject stale commands, duplicate creation, cyclic containment and transformation of an occupied support/container.
- Touch and click must both work. Invalid drops, audio replay and incomplete input are not wrong-language attempts. An explicit submission is required for spelling.
- Do not expose complete answers during unassisted listening checks. Guided, text-assisted and demonstration completions are separate evidence classes.
- No API key or private information in client code, VITE_* variables, logs or commits. No arbitrary HTML/JS, remote URLs or tool execution from model output.
- Real provider work requires explicitly approved credentials and budget. Lack of credentials blocks only live provider verification: continue the deterministic game, local fixtures and validation. Label fixtures clearly; never claim a simulated call was real.
- Use existing project commands. Install and commit a real npm lockfile when network access is available; do not invent lockfile hashes. Pin resolved dependencies and review changes; do not run forceful dependency upgrades blindly.

## Workflow

Inspect git status, current branch and origin/main before work. Preserve unrelated edits. One implementation owner per work package; another agent may review. Use separate branches/worktrees for concurrent work. Coordinate shared domain/content contracts before parallel changes; do not edit the same files simultaneously.

Implement an end-to-end slice, then the smallest meaningful regression coverage. Run npm test and, after dependency installation, npm run typecheck and npm run build. Add browser tests only where they validate a real interaction or a regression. Do not manufacture coverage by asserting constants or taking large snapshots. Fix failures caused by the change; disclose unrelated or environmental failures.

Never silently force-push, reset unrelated changes, disable security controls or mark unrun checks PASS. Follow the user's instructions for committing/pushing/PRs; otherwise leave reviewable local commits and report their status.

## Handoff

Keep comments about rationale and invariants, not narrated code. Update docs/STATUS.md with: implemented capability, exact commands/results, unrun checks, blockers and next package. Delivery reports include baseline/final SHA, changed behavior, necessary tests, actual browser/provider evidence, and remaining limitations. No claims of production quality or learning improvement without corresponding evidence.
