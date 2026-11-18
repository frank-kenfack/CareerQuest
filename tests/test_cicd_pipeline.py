from pathlib import Path
import unittest


ROOT_DIR = Path(__file__).resolve().parent.parent
GITLAB_CI_PATH = ROOT_DIR / ".gitlab-ci.yml"
GITHUB_WORKFLOW_PATH = ROOT_DIR / ".github" / "workflows" / "ci.yml"
CI_RUNNER_SCRIPT_PATH = ROOT_DIR / "scripts" / "run_ci_checks.py"


class CiCdPipelineConfigurationTest(unittest.TestCase):
    def test_gitlab_ci_defines_required_stages_and_jobs(self):
        self.assertTrue(GITLAB_CI_PATH.exists())
        gitlab_ci_content = GITLAB_CI_PATH.read_text(encoding="utf-8")

        for required_stage in ("- validate", "- test", "- build", "- deploy"):
            self.assertIn(required_stage, gitlab_ci_content)

        for required_job in (
            "schema-and-infra-tests:",
            "backend-django-tests:",
            "frontend-vitest-and-build:",
            "docker-build-images:",
            "deploy-production:",
        ):
            self.assertIn(required_job, gitlab_ci_content)

    def test_github_workflow_runs_backend_frontend_and_schema_tests(self):
        self.assertTrue(GITHUB_WORKFLOW_PATH.exists())
        github_workflow_content = GITHUB_WORKFLOW_PATH.read_text(encoding="utf-8")

        for required_job in (
            "schema-and-infra-tests:",
            "backend-django-tests:",
            "frontend-vitest-and-build:",
        ):
            self.assertIn(required_job, github_workflow_content)

    def test_ci_pipelines_enforce_migration_check_and_test_suites(self):
        gitlab_ci_content = GITLAB_CI_PATH.read_text(encoding="utf-8")
        github_workflow_content = GITHUB_WORKFLOW_PATH.read_text(encoding="utf-8")

        self.assertIn("makemigrations --check --dry-run", gitlab_ci_content)
        self.assertIn("makemigrations --check --dry-run", github_workflow_content)
        self.assertTrue(CI_RUNNER_SCRIPT_PATH.exists())


if __name__ == "__main__":
    unittest.main()
