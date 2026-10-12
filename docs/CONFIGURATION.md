# Private configuration and credential cleanup

Only .env.example files belong in version control. Local credentials and deployed settings use ignored files or the deployment secret store. Existing server environment files were removed from Git tracking but preserved on this machine with owner-only file permissions.

## Current runtime

For local execution, copy server/.env.example to server/.env.development if no local file already exists. Configure the DEV-suffixed variables and privately supply JWT_SECRET_DEV. For test-mode startup, use the TEST suffix; integration tests supply synthetic settings directly and do not read a database URI from these files. Production uses PROD suffix and settings supplied by the deployment operator. These suffixes are legacy runtime keys, not a new environment-tier convention.

Signing keys must be freshly generated privately before using an environment with real accounts. Existing local/test values were preserved, not certified safe or rotated. Do not reuse the former tracked values in deployments. Use an OS CSPRNG or secret manager; do not copy tutorial strings.

JWT expiration needs an explicit unit, such as 15m. Configure APP_URL with the exact origin and PORT with an integer. MONGO_URI must target the intended database. Client REACT_APP_API_URL includes /api and is public, never a secret.

## Compose

Supply HAPPIHUB_MONGO_ROOT_USERNAME and HAPPIHUB_MONGO_ROOT_PASSWORD privately, either in an ignored root .env file or exported environment. They are required when Compose parses this multi-profile file, including local-only invocations. Missing values fail explicitly rather than falling back to embedded credentials. Run docker compose config --quiet before any startup.

This cleanup does not repair shared volumes, exposed MongoDB ports, service topology or image pinning. Do not treat the existing prod profile as a validated production deployment. Changing initialization variables does not rotate credentials in an existing MongoDB data volume.

## Examples

The REST file references accessToken from a private client environment. Get it through login; do not paste it into the repository. JWT tutorial examples reference private process.env values and nonfunctional token placeholders. API documentation describes actual endpoints, not all historical tutorial examples.

## History and rotation

Removing files from the current tree does not erase earlier commits. Verify whether tracked signing/database values were ever used by a live service. If used, rotate through that service's configuration and invalidate affected sessions in a coordinated rollout. No live target was established in this cleanup. No deployment rotation or history rewrite was performed.
