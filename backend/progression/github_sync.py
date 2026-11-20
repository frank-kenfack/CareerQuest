import json
import urllib.error
import urllib.parse
import urllib.request


class GithubSyncError(Exception):
    pass


def fetch_github_repositories(github_username):
    encoded_username = urllib.parse.quote(github_username.strip())
    api_url = f"https://api.github.com/users/{encoded_username}/repos?per_page=100"
    request = urllib.request.Request(
        api_url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "CareerQuest-Hackathon-App",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
            if isinstance(payload, list):
                return payload
            return []
    except urllib.error.HTTPError as http_error:
        if http_error.code == 404:
            raise GithubSyncError(f"Le profil GitHub « {github_username} » est introuvable.")
        raise GithubSyncError(f"L'API GitHub a renvoye le code HTTP {http_error.code}.")
    except urllib.error.URLError:
        raise GithubSyncError("Impossible de joindre l'API GitHub.")


def evaluate_github_achievements(github_username, repositories_list):
    evaluated_achievements = [
        {
            "external_key": "github-account-linked",
            "title": f"Compte GitHub @{github_username} connecte",
            "xp_awarded": 50,
        }
    ]

    repo_count = len(repositories_list)
    if repo_count >= 1:
        evaluated_achievements.append(
            {
                "external_key": "github-public-repositories",
                "title": f"Contributeur Open Source ({repo_count} depots publics)",
                "xp_awarded": 100,
            }
        )

    detected_languages = sorted(
        {
            str(repo.get("language")).strip()
            for repo in repositories_list
            if repo.get("language")
        }
    )
    if detected_languages:
        languages_label = ", ".join(detected_languages[:3])
        evaluated_achievements.append(
            {
                "external_key": "github-detected-languages",
                "title": f"Stack technique detectee sur GitHub ({languages_label})",
                "xp_awarded": 120,
            }
        )

    has_careerquest_repo = any(
        str(repo.get("name", "")).lower() == "careerquest"
        for repo in repositories_list
    )
    if has_careerquest_repo:
        evaluated_achievements.append(
            {
                "external_key": "github-careerquest-repository",
                "title": "Architecte du depot GitHub CareerQuest",
                "xp_awarded": 150,
            }
        )

    return evaluated_achievements
