# Security policy

## Secrets

This app talks to model-provider APIs (Groq, Google Gemini, Cerebras, optional
Ollama/AI Gateway). Those keys are **secrets** and must never be committed.

- Keys live only in a local, git-ignored **`.env.local`**. The repo ships
  `.env.local.example` with **empty** values as setup documentation.
- `.gitignore` ignores all `.env*` files except the example.
- A [gitleaks](https://github.com/gitleaks/gitleaks) GitHub Action
  (`.github/workflows/gitleaks.yml`) scans every push and pull request against
  the full git history and fails the build if a key is ever committed.
- All ESG ratings in the repo are **calibrated synthetic data**, not licensed
  vendor scores — there is no proprietary dataset to leak.

## If a key is exposed

1. **Rotate it immediately** in the provider console (Groq / Google AI Studio /
   Cerebras).
2. Remove it from the working tree and, if it was committed, from history
   (`git filter-repo` or BFG), then force-push.
3. Confirm the gitleaks check is green again.

## Reporting

Please do not open a public issue for a security concern. Contact the maintainer
directly: Anny — [@ANNYM25](https://github.com/ANNYM25).
