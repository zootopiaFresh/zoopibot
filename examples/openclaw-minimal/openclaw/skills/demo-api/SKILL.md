---
name: demo-api
description: |
  Example skill for a generic application API.
version: 1.0.0
metadata:
  openclaw:
    requires:
      env:
        - APP_URL
        - APP_SERVICE_TOKEN
      bins:
        - curl
    primaryEnv: APP_SERVICE_TOKEN
---

## When to use

Use this skill when you want to call a generic protected application API.

## Health check example

```bash
curl -s "${APP_URL}/api/health" \
  -H "Authorization: Bearer ${APP_SERVICE_TOKEN}"
```
