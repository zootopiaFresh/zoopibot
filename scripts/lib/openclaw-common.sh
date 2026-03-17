#!/bin/bash

generate_secret() {
  local byte_count="${1:-32}"

  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$byte_count"
  elif command -v node >/dev/null 2>&1; then
    node -e "console.log(require('crypto').randomBytes(${byte_count}).toString('hex'))"
  elif command -v shasum >/dev/null 2>&1; then
    date +%s | shasum -a 256 | cut -d' ' -f1
  elif command -v sha256sum >/dev/null 2>&1; then
    date +%s | sha256sum | cut -d' ' -f1
  else
    date +%s
  fi
}

upsert_env_file() {
  local env_file="$1"
  local key="$2"
  local value="$3"
  local tmp

  tmp="$(mktemp)"
  touch "$env_file"
  awk -v key="$key" -v value="$value" '
    BEGIN { done = 0 }
    index($0, key "=") == 1 {
      print key "=\"" value "\""
      done = 1
      next
    }
    { print }
    END {
      if (!done) {
        print key "=\"" value "\""
      }
    }
  ' "$env_file" > "$tmp"
  mv "$tmp" "$env_file"
}

delete_env_file() {
  local env_file="$1"
  local key="$2"
  local tmp

  tmp="$(mktemp)"
  touch "$env_file"
  awk -v key="$key" 'index($0, key "=") != 1 { print }' "$env_file" > "$tmp"
  mv "$tmp" "$env_file"
}

openclaw_provider_metadata() {
  local provider="$1"
  local openclaw_cmd="${2:-openclaw}"

  OPENCLAW_PROVIDER_INLINE_ENV_KEY=""
  OPENCLAW_PROVIDER_DEFAULT_MODEL=""
  OPENCLAW_PROVIDER_AUTH_HINT=""

  case "$provider" in
    openai-api-key)
      OPENCLAW_PROVIDER_INLINE_ENV_KEY="OPENAI_API_KEY"
      OPENCLAW_PROVIDER_DEFAULT_MODEL="openai/gpt-5.4"
      ;;
    openai-codex)
      OPENCLAW_PROVIDER_DEFAULT_MODEL="openai-codex/gpt-5.4"
      OPENCLAW_PROVIDER_AUTH_HINT="$openclaw_cmd models auth login --provider openai-codex"
      ;;
    anthropic-api-key)
      OPENCLAW_PROVIDER_INLINE_ENV_KEY="ANTHROPIC_API_KEY"
      ;;
    anthropic-setup-token)
      ;;
    *)
      return 1
      ;;
  esac
}

clear_openclaw_provider_secret_envs() {
  local env_file="$1"
  local keep_key="${2:-}"

  for key in OPENAI_API_KEY ANTHROPIC_API_KEY; do
    if [ "$key" != "$keep_key" ]; then
      delete_env_file "$env_file" "$key"
    fi
  done
}

install_openclaw_skill() {
  local source_dir="$1"
  local skills_dir="$2"
  local skill_name="$3"

  mkdir -p "$skills_dir"

  if [ -n "$skill_name" ] && [ -d "$source_dir" ]; then
    rm -rf "$skills_dir/$skill_name"
    cp -R "$source_dir" "$skills_dir/"
    return 0
  fi

  return 1
}

build_openclaw_skill_entry_json() {
  local skill_name="$1"
  shift

  if [ -z "$skill_name" ]; then
    return 0
  fi

  local env_lines=""
  local pair

  for pair in "$@"; do
    local key="${pair%%=*}"
    local value="${pair#*=}"

    if [ -n "$env_lines" ]; then
      env_lines="${env_lines},
"
    fi

    env_lines="${env_lines}          \"${key}\": \"${value}\""
  done

  if [ -n "$env_lines" ]; then
    cat <<EOF
      "${skill_name}": {
        "enabled": true,
        "env": {
${env_lines}
        }
      }
EOF
    return 0
  fi

  cat <<EOF
      "${skill_name}": {
        "enabled": true
      }
EOF
}

write_openclaw_config() {
  local config_file="$1"
  local workspace_dir="$2"
  local primary_model="$3"
  local gateway_port="$4"
  local gateway_token="$5"
  local skill_entry_json="${6:-}"
  local provider_env_key="${7:-}"
  local provider_env_value="${8:-}"
  local env_block=""
  local skills_block='  "skills": {
    "entries": {}
  }'

  mkdir -p "$(dirname "$config_file")" "$workspace_dir"

  if [ -n "$provider_env_key" ]; then
    env_block=$(cat <<EOF
  "env": {
    "${provider_env_key}": "${provider_env_value}"
  },

EOF
)
  fi

  if [ -n "$skill_entry_json" ]; then
    skills_block=$(cat <<EOF
  "skills": {
    "entries": {
${skill_entry_json}
    }
  }
EOF
)
  fi

  cat > "$config_file" <<EOF
{
  "\$schema": "https://openclaw.ai/schema/openclaw.json",

${env_block}  "agents": {
    "defaults": {
      "workspace": "${workspace_dir}",
      "model": {
        "primary": "${primary_model}"
      }
    }
  },

  "gateway": {
    "mode": "local",
    "port": ${gateway_port},
    "auth": {
      "token": "${gateway_token}"
    },
    "http": {
      "endpoints": {
        "chatCompletions": { "enabled": true }
      }
    }
  },

${skills_block}
}
EOF
}
