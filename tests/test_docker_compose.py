from pathlib import Path
import unittest


COMPOSE_FILE_PATH = Path(__file__).resolve().parent.parent / "docker-compose.yml"


class DockerComposeConfigurationTest(unittest.TestCase):
    def test_docker_compose_defines_three_services_and_persistent_volume(self):
        compose_content = COMPOSE_FILE_PATH.read_text(encoding="utf-8")

        self.assertIn("db:", compose_content)
        self.assertIn("backend:", compose_content)
        self.assertIn("frontend:", compose_content)
        self.assertIn("postgres:16-alpine", compose_content)
        self.assertIn("postgres_storage:/var/lib/postgresql/data", compose_content)
        self.assertIn("condition: service_healthy", compose_content)
        self.assertIn("careerquest-network:", compose_content)


if __name__ == "__main__":
    unittest.main()
