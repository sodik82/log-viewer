#!/bin/bash
set -e

# fixes: default user does not have permissions to mounted volumes
if [ -d /home/node/.claude ]; then
  sudo chown -R node:node /home/node/.claude
  # fixes: without claude.json it cannot remember claude login from CLI
  # and it is not possible to mount a file before it is created
  [ -f /home/node/.claude/.claude.json ] || echo '{}' > /home/node/.claude/.claude.json
  ln -sf /home/node/.claude/.claude.json /home/node/.claude.json
fi

pnpm install --frozen-lockfile
