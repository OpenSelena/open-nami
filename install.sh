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
  ORANGE="\033[38;2;193;95;60m"
  GREEN="\033[32m"
  RED="\033[31m"
else
  BOLD=""
  DIM=""
  RESET=""
  ORANGE=""
  GREEN=""
  RED=""
fi

printf "\n"
printf "${ORANGE}${BOLD}  ___                   _   _                 _ ${RESET}\n"
printf "${ORANGE}${BOLD} / _ \ _ __   ___ _ __ | \ | | __ _ _ __ ___ (_) ${RESET}\n"
printf "${ORANGE}${BOLD}| | | | '_ \ / _ \ '_ \|  \| |/ _\` | '_ \` _ \| | ${RESET}\n"
printf "${ORANGE}${BOLD}| |_| | |_) |  __/ | | | |\  | (_| | | | | | | | ${RESET}\n"
printf "${ORANGE}${BOLD} \___/| .__/ \___|_| |_|_| \_|\__,_|_| |_| |_|_| ${RESET}\n"
printf "${ORANGE}${BOLD}      |_|                                        ${RESET}\n"
printf "\n"
printf "${DIM}  Open Nami installer — bulk social media profile downloader.${RESET}\n\n"

# Step 1: Check for Node.js
printf "  Checking Node.js... "
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v | sed 's/^v//')
  NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge 18 ]; then
    printf "${GREEN}ok${RESET} ${DIM}(v%s)${RESET}\n" "$NODE_VER"
  else
    printf "${RED}failed${RESET}\n"
    printf "\n${RED}Error: Node.js 18 or higher is required (found v%s).${RESET}\n" "$NODE_VER"
    printf "Please update Node.js and try again: ${BOLD}https://nodejs.org${RESET}\n\n"
    exit 1
  fi
else
  printf "${RED}not found${RESET}\n"
  printf "\n${RED}Error: Node.js is not installed.${RESET}\n"
  printf "Please install Node.js 18+ and try again: ${BOLD}https://nodejs.org${RESET}\n\n"
  exit 1
fi

# Step 2: Check for npm
printf "  Checking npm... "
if command -v npm >/dev/null 2>&1; then
  NPM_VER=$(npm -v)
  printf "${GREEN}ok${RESET} ${DIM}(v%s)${RESET}\n" "$NPM_VER"
else
  printf "${RED}not found${RESET}\n"
  printf "\n${RED}Error: npm is not installed.${RESET}\n"
  printf "npm is required to install Open Nami globally.\n\n"
  exit 1
fi

# Step 3: Install Open Nami globally
printf "  Installing open-nami globally via npm... "
if npm install -g open-nami >/dev/null 2>&1; then
  printf "${GREEN}done${RESET}\n"
else
  printf "${RED}failed${RESET}\n"
  if command -v sudo >/dev/null 2>&1; then
    printf "  Retrying with sudo... "
    if sudo npm install -g open-nami >/dev/null 2>&1; then
      printf "${GREEN}done${RESET}\n"
    else
      printf "${RED}failed${RESET}\n"
      printf "\n${RED}Error: Failed to install open-nami globally.${RESET}\n"
      printf "Try running manually: ${BOLD}npm install -g open-nami${RESET}\n\n"
      exit 1
    fi
  else
    printf "\n${RED}Error: Failed to install open-nami globally.${RESET}\n"
    printf "Try running manually: ${BOLD}npm install -g open-nami${RESET}\n\n"
    exit 1
  fi
fi

# Step 4: Verify installation
printf "  Verifying binary... "
if command -v open-nami >/dev/null 2>&1; then
  printf "${GREEN}ok${RESET}\n"
else
  printf "${RED}warning${RESET}\n"
  printf "${DIM}  Installed, but 'open-nami' was not found on your current PATH.${RESET}\n"
  printf "${DIM}  Make sure your npm global bin directory is in PATH.${RESET}\n"
  printf "${DIM}  Usually: export PATH=\"\$(npm prefix -g)/bin:\$PATH\"${RESET}\n"
fi

# Step 5: Optional gallery-dl check
printf "  Checking gallery-dl... "
if command -v gallery-dl >/dev/null 2>&1; then
  GDL_VER=$(gallery-dl --version 2>/dev/null || echo "detected")
  printf "${GREEN}found${RESET} ${DIM}(%s)${RESET}\n" "$GDL_VER"
else
  printf "${DIM}will use python fallback or PATH${RESET}\n"
fi

# Step 6: Optional yt-dlp check
printf "  Checking yt-dlp... "
if command -v yt-dlp >/dev/null 2>&1; then
  YTDLP_VER=$(yt-dlp --version 2>/dev/null || echo "detected")
  printf "${GREEN}found${RESET} ${DIM}(%s)${RESET}\n" "$YTDLP_VER"
else
  printf "${DIM}will use python fallback or PATH${RESET}\n"
fi

printf "\n"
printf "${GREEN}${BOLD}  Open Nami installed successfully!${RESET}\n\n"
printf "  Run it now:\n"
printf "    ${BOLD}open-nami <url-or-user>${RESET}    ${DIM}# straight to the media picker${RESET}\n"
printf "    ${BOLD}open-nami${RESET}                 ${DIM}# interactive home screen${RESET}\n"
printf "\n"
