"""Set up Python dependencies and start the bundled local web application."""

import hashlib
import os
from pathlib import Path
import subprocess
import sys
import venv

ROOT = Path(__file__).resolve().parent
ENVIRONMENT = ROOT / ".venv"


def main():
    if not (3, 10) <= sys.version_info[:2] <= (3, 13):
        raise SystemExit("Please run this project with Python 3.10–3.13. Python 3.12 is recommended.")

    python = ENVIRONMENT / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    if not python.exists():
        print("Creating a Python environment…", flush=True)
        venv.EnvBuilder(with_pip=True).create(ENVIRONMENT)

    requirements = ROOT / "requirements.txt"
    signature = hashlib.sha256(requirements.read_bytes()).hexdigest()
    stamp = ENVIRONMENT / ".requirements-sha256"
    if not stamp.is_file() or stamp.read_text(encoding="ascii") != signature:
        print("Installing Python dependencies. Internet access is needed for this step.", flush=True)
        subprocess.run(
            [str(python), "-m", "pip", "install", "-r", str(requirements)],
            cwd=ROOT,
            check=True,
        )
        stamp.write_text(signature, encoding="ascii")

    try:
        return subprocess.call(
            [str(python), str(ROOT / "backend" / "app.py"), *sys.argv[1:]],
            cwd=ROOT,
        )
    except KeyboardInterrupt:
        return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, subprocess.CalledProcessError) as error:
        sys.exit(f"Reef Lab setup could not finish. {error}")
