from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path


def find_node() -> str | None:
    """Locate the node executable on system PATH."""
    for candidate in ("node", "nodejs"):
        found = shutil.which(candidate)
        if found:
            return found
    return None


def main() -> None:
    """Execute Open Nami terminal application via bundled Node.js CLI."""
    node_bin = find_node()
    if not node_bin:
        sys.stderr.write(
            "\n"
            "  Error: Node.js (version 20 or newer) is required to run Nami.\n"
            "  'node' was not found on your system PATH.\n\n"
            "  Please install Node.js from https://nodejs.org or via your package manager:\n"
            "    - Windows: winget install OpenJS.NodeJS\n"
            "    - macOS:   brew install node\n"
            "    - Debian:  sudo apt install nodejs npm\n"
            "    - Arch:    sudo pacman -S nodejs npm\n\n"
        )
        sys.exit(1)

    package_dir = Path(__file__).resolve().parent
    bundle_path = package_dir / "dist" / "cli.js"

    if not bundle_path.is_file():
        bundle_path = package_dir / "cli.js"

    if not bundle_path.is_file():
        npx_bin = shutil.which("npx")
        if npx_bin:
            try:
                proc = subprocess.run([npx_bin, "open-nami", *sys.argv[1:]])
                sys.exit(proc.returncode)
            except KeyboardInterrupt:
                sys.exit(130)

        sys.stderr.write(
            f"\n  Error: Open Nami bundle not found at {bundle_path}\n"
        )
        sys.exit(1)

    try:
        proc = subprocess.run([node_bin, str(bundle_path), *sys.argv[1:]])
        sys.exit(proc.returncode)
    except KeyboardInterrupt:
        sys.exit(130)


if __name__ == "__main__":
    main()
