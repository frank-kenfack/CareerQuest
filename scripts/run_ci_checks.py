from pathlib import Path
import json
import subprocess
import sys
import time
import urllib.request


ROOT_DIR = Path(__file__).resolve().parent.parent


def run_step(step_description, command_args):
    print(f"==> {step_description}")
    completed_process = subprocess.run(command_args, cwd=ROOT_DIR)
    if completed_process.returncode != 0:
        sys.exit(completed_process.returncode)


def fetch_json_endpoint(endpoint_url):
    with urllib.request.urlopen(endpoint_url, timeout=10) as response:
        if response.status != 200:
            raise RuntimeError(f"Echec HTTP {response.status} sur {endpoint_url}")
        return json.loads(response.read().decode("utf-8"))


def wait_for_backend_ready(timeout_seconds=45):
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            health_payload = fetch_json_endpoint("http://localhost:8000/api/health/")
            if health_payload.get("database") == "connected":
                return health_payload
        except Exception:
            time.sleep(1.5)
    raise RuntimeError("Le service Backend n'est pas redevenu disponible apres redemarrage.")


def verify_live_endpoints():
    print("==> Verification des points de terminaison HTTP Backend (:8000) et Reverse Proxy Nginx (:3000)")
    for endpoint_url in (
        "http://localhost:8000/api/health/",
        "http://localhost:8000/api/avatar/progression-tiers/",
        "http://localhost:8000/api/skills/",
        "http://localhost:8000/api/quests/",
        "http://localhost:8000/api/leaderboard/students/",
        "http://localhost:8000/api/leaderboard/schools/",
        "http://localhost:3000/api/health/",
        "http://localhost:3000/api/leaderboard/students/",
        "http://localhost:3000/api/leaderboard/schools/",
    ):
        fetch_json_endpoint(endpoint_url)
        print(f"  OK : {endpoint_url} (HTTP 200 JSON)")

    with urllib.request.urlopen("http://localhost:3000/", timeout=10) as frontend_response:
        if frontend_response.status != 200:
            raise RuntimeError(f"Echec HTTP {frontend_response.status} sur http://localhost:3000/")
        html_body = frontend_response.read().decode("utf-8")
        if "CareerQuest" not in html_body:
            raise RuntimeError("La page d'accueil servie par Nginx ne contient pas CareerQuest.")
        print("  OK : http://localhost:3000/ (HTTP 200 Frontend React via Nginx)")


def verify_database_persistence_across_restart():
    print("==> Verification de la persistance PostgreSQL 16 apres redemarrage des conteneurs db et backend")
    initial_health = fetch_json_endpoint("http://localhost:8000/api/health/")
    initial_students = fetch_json_endpoint("http://localhost:8000/api/leaderboard/students/")
    initial_schools = fetch_json_endpoint("http://localhost:8000/api/leaderboard/schools/")

    if len(initial_students) < 5 or len(initial_schools) < 4:
        raise RuntimeError("Les donnees de demonstration initiales sont incompletes avant redemarrage.")

    run_step(
        "Redemarrage des conteneurs db et backend",
        ["docker", "compose", "restart", "db", "backend"],
    )
    post_restart_health = wait_for_backend_ready()
    post_restart_students = fetch_json_endpoint("http://localhost:8000/api/leaderboard/students/")
    post_restart_schools = fetch_json_endpoint("http://localhost:8000/api/leaderboard/schools/")

    if post_restart_health.get("registered_students_count") != initial_health.get("registered_students_count"):
        raise RuntimeError("Le nombre de profils etudiants a change apres redemarrage.")
    if post_restart_students[0]["username"] != initial_students[0]["username"]:
        raise RuntimeError("Le premier etudiant du classement a change apres redemarrage.")
    if post_restart_students[0]["experience_points"] != initial_students[0]["experience_points"]:
        raise RuntimeError("L'experience du premier etudiant n'a pas ete conservee apres redemarrage.")
    if len(post_restart_schools) != len(initial_schools):
        raise RuntimeError("Le nombre d'ecoles du classement a change apres redemarrage.")

    print(
        f"  OK : Persistance PostgreSQL verifiee ({len(post_restart_students)} etudiants, "
        f"{len(post_restart_schools)} ecoles, leader {post_restart_students[0]['username']} "
        f"avec {post_restart_students[0]['experience_points']} XP conserves)."
    )


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
    verify_database_persistence_across_restart()
    print("==> Toutes les verifications CI et de persistance sont validees.")


if __name__ == "__main__":
    main()
