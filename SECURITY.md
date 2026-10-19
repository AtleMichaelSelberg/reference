# Credentials and local setup

## Remediate exposed credentials

Treat credentials previously committed to this public repository as compromised.
Removing them from the current files does not revoke them or erase Git history.

- Rotate the exposed Django `SECRET_KEY` in every environment where it was used.
  This project uses that key to sign JWTs through Simple JWT's default signing
  configuration. Replacing it invalidates existing access and refresh tokens and
  signed sessions; users must sign in again. Do not retain the exposed key as a
  verification fallback. See [backend settings](reference_backend/config/settings.py)
  and [Simple JWT's signing-key documentation](https://django-rest-framework-simplejwt.readthedocs.io/en/stable/settings.html#signing-key).
- Reset passwords or disable every deployed account whose credentials appeared
  in current **or historical** seed data, including historical staff and superuser
  accounts. Inspect the deployed database; the current seed is not a complete
  inventory of historical accounts. From the configured backend environment,
  `python manage.py changepassword EMAIL` prompts for a replacement without
  placing it in shell history. Password changes alone do not revoke this
  project's already-issued JWTs; rotate the signing key as well.
- Revoke any other exposed credentials at their issuing service, including
  credentials reused elsewhere. Review affected account activity.

These are operator actions; applying this source change does not modify deployed
keys, accounts, or databases. Render's [deployment configuration](render.yaml)
generates a key for a new service; it does not rotate an existing deployed key.

**Never run `manage.py seed` as live remediation.** The
[seed command](reference_backend/users/management/commands/seed.py) deletes users,
endorsements, and profile pictures before recreating demo data. Newly seeded
profiles have unusable passwords until an operator sets one; this change does
not update accounts already in a deployed database.

History removal is a separate, coordinated operation involving branches, tags,
clones, forks, and cached references. Rotate credentials first and follow
[GitHub's sensitive-data removal procedure](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
A cleanup PR cannot remove previous commits or copies held by others.

## Run locally without shared credentials

Use Python 3.12 or newer for the Django backend. From `reference_backend/`:

```sh
make install
export SECRET_KEY="$(.venv/bin/python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')"
export DEBUG=true
export ALLOWED_HOSTS='localhost,127.0.0.1,[::1]'
make migrate
make run
```

Keep the same private key in your local environment between restarts if you want
existing tokens to remain valid. The backend rejects an empty or missing
`SECRET_KEY`; `DEBUG` defaults to false and allowed hosts default to local hosts.
Set exact deployment hosts and `CORS_ALLOWED_ORIGINS` for a deployment, keeping
`DEBUG=false`. Debug mode permits all CORS origins for local development.

The [environment template](reference_backend/.env.example) is documentation;
neither Django nor the [Makefile](reference_backend/Makefile) loads `.env`
automatically. Export variables explicitly. Alternatively, source only a trusted,
shell-compatible local file with `set -a; . ./.env; set +a` before running commands.
Never commit populated environment files, private keys, or local databases.

For disposable demo data only, run `.venv/bin/python manage.py seed`, then
`.venv/bin/python manage.py changepassword EMAIL` for a selected profile. The
[user model](reference_backend/users/models.py) uses email as its login identifier.
Use `make superuser` to create a separate local administrator. The frontend
requires an explicitly entered email and password; it contains no shared
login credentials. Its `EXPO_PUBLIC_*` variables are public client configuration
and must never contain secrets.

## Check changes before committing

Install `pre-commit` in your development environment, then run `pre-commit install`
from the repository root to enable the pinned Gitleaks hook. The hook checks
staged changes; `pre-commit run --all-files` still uses that staged-change scope.
For a full filesystem scan, separately install Gitleaks v8.30.1 and run
`gitleaks dir . --redact --config .gitleaks.toml` from the repository root. The
[hook configuration](.pre-commit-config.yaml) pins Gitleaks and the
[scan configuration](.gitleaks.toml) adds checks for this project's prior credential
patterns. These scans do not revoke credentials or remove Git history.
