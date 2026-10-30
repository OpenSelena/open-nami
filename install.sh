#!/usr/bin/env sh
set -eu

# Open Nami Installer
# Usage: curl -fsSL https://mint.dev.cv | sh
#        or: sh install.sh

# Colors & Formatting (only when stdout is a terminal)
if [ -t 1 ]; then
  BOLD="\033[1m"
  DIM="\033[2m"
  RESET="\033[0m"
  if [ "${COLORTERM:-}" = "truecolor" ] || [ "${COLORTERM:-}" = "24bit" ]; then
    BRAND="\033[38;2;193;95;60m"
  else
    BRAND="\033[38;5;166m"
  fi
  GREEN="\033[32m"
  RED="\033[31m"
  YELLOW="\033[33m"
else
  BOLD=""
  DIM=""
  RESET=""
  BRAND=""
  GREEN=""
  RED=""
  YELLOW=""
fi

printf "\n"
printf "${BRAND}${BOLD}  █▀█ █▀█ █▀▀ █▀▄█  █▀▄█ █▀█ █▀▄▀█ ▀█▀${RESET}\n"
printf "${BRAND}${BOLD}  █ ▓ █▀▓ █▀▓ █  ▓  █  ▓ █▀█ █ ▓ █  ▓ ${RESET}\n"
printf "${BRAND}${BOLD}  ▀▀▀ ▀   ▀▀▀ ▀  ▀  ▀  ▀ ▀ ▀ ▀   ▀ ▀▀▀${RESET}\n"
printf "  ${DIM}grab any profile. paste. download. done.${RESET}\n\n"

# 1. Node.js Check
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v | sed 's/^v//')
  NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge 20 ]; then
    printf "  ${GREEN}✓${RESET} Node.js ${DIM}(v%s)${RESET}\n" "$NODE_VER"
  else
    printf "  ${RED}✗${RESET} Node.js v%s (Node.js 20+ required)\n" "$NODE_VER"
    printf "    Please update Node.js: ${BOLD}https://nodejs.org${RESET}\n\n"
    exit 1
  fi
else
  printf "  ${RED}✗${RESET} Node.js not found (Node.js 20+ required)\n"
  printf "    Please install Node.js: ${BOLD}https://nodejs.org${RESET}\n\n"
  exit 1
fi

# 2. npm Check
if command -v npm >/dev/null 2>&1; then
  NPM_VER=$(npm -v)
  printf "  ${GREEN}✓${RESET} npm ${DIM}(v%s)${RESET}\n" "$NPM_VER"
else
  printf "  ${RED}✗${RESET} npm not found\n\n"
  exit 1
fi

# 3. Global npm Install
printf "  ${DIM}• Installing open-nami...${RESET}\r"
INSTALLED=0
if npm install -g open-nami >/dev/null 2>&1; then
  INSTALLED=1
elif command -v sudo >/dev/null 2>&1; then
  if [ -r /dev/tty ] && [ -w /dev/tty ]; then
    if sudo </dev/tty npm install -g open-nami >/dev/null 2>&1; then
      INSTALLED=1
    fi
  fi
fi

if [ "$INSTALLED" -eq 1 ]; then
  printf "  ${GREEN}✓${RESET} Installed open-nami            \n"
else
  printf "  ${RED}✗${RESET} Failed to install open-nami globally\n\n"
  printf "  Try running manually:\n"
  printf "    ${BOLD}sudo npm install -g open-nami${RESET}\n\n"
  exit 1
fi

# 4. Verify Binary in PATH
if command -v open-nami >/dev/null 2>&1; then
  VER=$(open-nami --version 2>/dev/null || echo "")
  if [ -n "$VER" ]; then
    printf "  ${GREEN}✓${RESET} Binary ready ${DIM}(v%s)${RESET}\n" "$VER"
  fi
else
  NPM_BIN=""
  if command -v npm >/dev/null 2>&1; then
    NPM_BIN="$(npm prefix -g 2>/dev/null)/bin"
  fi
  printf "  ${YELLOW}!${RESET} Installed, but 'open-nami' is not in PATH\n"
  if [ -n "$NPM_BIN" ] && [ -d "$NPM_BIN" ]; then
    printf "    Add to ~/.bashrc or ~/.zshrc:\n"
    printf "      ${BOLD}export PATH=\"%s:\$PATH\"${RESET}\n" "$NPM_BIN"
  fi
fi

# 5. Optional Extractor Engines
if command -v gallery-dl >/dev/null 2>&1; then
  printf "  ${GREEN}✓${RESET} gallery-dl found\n"
fi
if command -v yt-dlp >/dev/null 2>&1; then
  printf "  ${GREEN}✓${RESET} yt-dlp found\n"
fi

printf "\n  ${BOLD}Ready.${RESET} Run:\n"
printf "    ${BOLD}open-nami${RESET}               ${DIM}# interactive home screen${RESET}\n"
printf "    ${BOLD}open-nami <url-or-user>${RESET} ${DIM}# direct download${RESET}\n\n"
