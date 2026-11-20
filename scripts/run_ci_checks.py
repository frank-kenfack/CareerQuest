from pathlib import Path
import subprocess
import sys
import urllib.request
import json


ROOT_DIR = Path(__file__).resolve().parent.parent


def run_step(step_description, command_args):
    print(f"==> {step_description}")
    completed_process = subprocess.run(command_args, cwd=ROOT_DIR)
    if completed_process.returncode != 0:
        sys.exit(completed_process.returncode)


def verify_live_endpoints():
    print("==> Verification des points de terminaison HTTP de la pile Docker Compose")
    for endpoint_url in (
        "http://localhost:8000/api/health/",
        "http://localhost:8000/api/avatar/progression-tiers/",
        "http://localhost:8000/api/skills/",
        "http://localhost:8000/api/quests/",
        "http://localhost:8000/api/leaderboard/students/",
        "http://localhost:8000/api/leaderboard/schools/",
    ):
        with urllib.request.urlopen(endpoint_url, timeout=10) as response:
            if response.status != 200:
                raise RuntimeError(f"Echec HTTP {response.status} sur {endpoint_url}")
            json.loads(response.read().decode("utf-8"))
            print(f"  OK : {endpoint_url} (HTTP 200)")


def main():
    run_step(
        "Execution des tests de schema et d'infrastructure",
        [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-v"],
    )
    run_step(
        "Verification de la synchronisation des migrations Django",
        ["docker", "compose", "exec", "-T", "backend", "python", "manage.py", "makemigrations", "--check", "--dry-run"],
    )
    run_step(
        "Execution de la suite de tests Django sur PostgreSQL 16",
        ["docker", "compose", "exec", "-T", "backend", "python", "manage.py", "test", "-v", "2"],
    )
    verify_live_endpoints()
    print("==> Toutes les verifications CI sont validees.")


if __name__ == "__main__":
    main()
