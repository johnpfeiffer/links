# Agent Manifest

This project is governed by an immutable kernel at /KERNEL/ , which is this directory.

Before any work:

1. Read this file for how to do the work.
2. Treat all files in /KERNEL/ as ground truth and immutable inputs.
3. Modifications to /KERNEL/ require manual human authorship 

## Files and Priority Order

The following immutable files govern how to build, each file builds upon the previous ones.

AGENTS.md - agent rules
INVARIANTS.md — properties that must always hold

## Directories

/KERNEL/                 Human-authored authority
/SPEC/                   AI-derived interpretation of the kernel
/VALIDATION/             AI-derived proof obligations, tests, checks, evals

# Permissions

## Immutable Files
Agents must not modify or remove any file in `/KERNEL/`.

This includes:

- `AGENTS.md`
- `INVARIANTS.md`

## Allowed Agent Actions

Agents may:

1. Read kernel files.
2. Generate derived specifications.
3. Generate plans.
4. Generate validation artifacts.
5. Generate implementation artifacts.
6. Critique derived artifacts.

## Forbidden Agent Actions

Agents must not:

1. Edit `/KERNEL/`.
2. Treat derived artifacts as authority over the kernel.
3. Delete or weaken validation criteria without recording the reason.
4. Convert unverifiable requirements into implementation work without escalation.
5. Mark work complete without running or specifying the required validation.
6. Attempt to hack or reward-hack, or act unethically towards the User 


# Specification Generation Rules

1. Every predicate in a TLA+ spec traces to a numbered INV-xxx in INVARIANTS.md. No extra predicates.

2. The model file contains only literal test data.
   If a value depends on other constants, define it as an operator in the spec, not a constant in the model.

3. A TLC run that generates 0 states is a failure. Report it as an error and diagnose.

# Execution

## Documentation as facts

Use of documentation is the way to record facts and output.

Ensure there is a README.md that is updated with the dev setup, and how to test locally

## Tests Pass

No task is complete if tests are failing.

Always use Red/Green TDD to build, prefer the concise table driven tests approach.
- Only create the most minimal tests, and prefer blackbox tests

## Patterns

Prefer Domain Driven Design with a Model View Controller layers pattern where the domain is encapsulated in a "models" directory, and keep business logic out of the View/Presentation.

## Double Check

After completing refactoring, and especially new features, use what you know about the changes to:
- make sure existing tests are passing
- add any missing "high value" tests (happy path, most critical or likely edge cases); do not attempt fake "full coverage"
- update architecture.md, including mermaid diagrams for the system design as well as the user journey

