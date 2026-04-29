# Potential TODOs

- Lambda deploy.sh sets env vars with `Variables={...}` which replaces all env
  vars — if a second env var is added to a lambda, update deploy.sh to include
  it explicitly
- No retry logic in lambdas — a single retry on 5xx would help with YouTube API
  flakiness
