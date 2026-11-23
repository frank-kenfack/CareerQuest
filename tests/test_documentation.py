from pathlib import Path
import unittest


ROOT_DIR = Path(__file__).resolve().parent.parent
README_PATH = ROOT_DIR / "README.md"
ENV_EXAMPLE_PATH = ROOT_DIR / ".env.example"


class ReadmeDocumentationTest(unittest.TestCase):
    def test_readme_documents_purpose_installation_and_launch_commands(self):
        self.assertTrue(README_PATH.exists())
        self.assertTrue(ENV_EXAMPLE_PATH.exists())
        readme_content = README_PATH.read_text(encoding="utf-8")

        self.assertIn("## Présentation détaillée du travail réalisé", readme_content)
        self.assertIn("## Étapes de configuration réalisées pour l'infrastructure et le DevOps", readme_content)
        self.assertIn("## Installation", readme_content)
        self.assertIn("## Lancement", readme_content)
        self.assertIn("## Bilan et résultats obtenus à la fin du projet", readme_content)
        self.assertIn("git clone https://github.com/frank-kenfack/CareerQuest.git", readme_content)
        self.assertIn("cp .env.example .env", readme_content)
        self.assertIn("Copy-Item .env.example .env", readme_content)
        self.assertIn("docker compose up -d --build", readme_content)
        self.assertIn("python scripts/run_ci_checks.py", readme_content)
        self.assertIn("sh scripts/deploy-k8s.sh", readme_content)
        self.assertNotIn("—", readme_content)
        self.assertNotIn("–", readme_content)


if __name__ == "__main__":
    unittest.main()
