from pathlib import Path
import sqlite3
import unittest


SCHEMA_FILE_PATH = Path(__file__).resolve().parent.parent / "docs" / "schema.sql"


class CareerQuestSchemaTest(unittest.TestCase):
    def setUp(self):
        self.connection = sqlite3.connect(":memory:")
        # SQLite desactive les cles etrangeres par defaut sur chaque nouvelle connexion.
        self.connection.execute("PRAGMA foreign_keys = ON;")
        schema_sql = SCHEMA_FILE_PATH.read_text(encoding="utf-8")
        self.connection.executescript(schema_sql)

    def tearDown(self):
        self.connection.close()

    def test_all_domain_tables_exist(self):
        cursor = self.connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';"
        )
        existing_tables = {row[0] for row in cursor.fetchall()}
        expected_tables = {
            "school",
            "student_profile",
            "avatar",
            "skill_node",
            "unlocked_skill",
            "quest",
            "quest_completion",
            "external_achievement",
        }
        self.assertEqual(existing_tables, expected_tables)

    def test_student_avatar_and_skill_progression_constraints(self):
        self.connection.execute(
            "INSERT INTO school (id, name, city) VALUES (1, 'Ecole Polytechnique DevOps', 'Paris');"
        )
        self.connection.execute(
            """
            INSERT INTO student_profile (id, username, email, password_hash, school_id, github_username)
            VALUES (1, 'alice', 'alice@ecole.fr', 'pbkdf2_sha256$hash', 1, 'alice-dev');
            """
        )
        self.connection.execute(
            "INSERT INTO avatar (student_id, level, experience_points, title, visual_tier) VALUES (1, 1, 0, 'Novice', 'novice');"
        )

        # Un etudiant ne peut pas posseder deux avatars.
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute(
                "INSERT INTO avatar (student_id, level, experience_points, title, visual_tier) VALUES (1, 2, 100, 'Doublon', 'apprenti');"
            )

        # Une experience negative viole la contrainte metier.
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute(
                "UPDATE avatar SET experience_points = -10 WHERE student_id = 1;"
            )

        self.connection.execute(
            """
            INSERT INTO skill_node (id, code, name, category, description, xp_reward, required_level, parent_skill_id)
            VALUES (1, 'docker-basics', 'Conteneurisation Docker', 'devops', 'Bases de Docker', 50, 1, NULL);
            """
        )
        self.connection.execute(
            """
            INSERT INTO skill_node (id, code, name, category, description, xp_reward, required_level, parent_skill_id)
            VALUES (2, 'k8s-orchestration', 'Orchestration Kubernetes', 'cloud', 'Deploiement cluster', 100, 2, 1);
            """
        )

        self.connection.execute(
            "INSERT INTO unlocked_skill (student_id, skill_id) VALUES (1, 1);"
        )
        # Le deblocage d'une meme competence deux fois par le meme etudiant est interdit.
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute(
                "INSERT INTO unlocked_skill (student_id, skill_id) VALUES (1, 1);"
            )

    def test_quest_and_external_achievement_uniqueness(self):
        self.connection.execute(
            """
            INSERT INTO student_profile (id, username, email, password_hash)
            VALUES (1, 'bob', 'bob@ecole.fr', 'pbkdf2_sha256$hash');
            """
        )
        self.connection.execute(
            """
            INSERT INTO quest (id, code, title, quest_type, description, xp_reward)
            VALUES (1, 'ci-pipeline', 'Configurer GitLab CI', 'project', 'Pipeline complet', 120);
            """
        )
        self.connection.execute(
            """
            INSERT INTO quest_completion (student_id, quest_id, status, proof_url)
            VALUES (1, 1, 'completed', 'https://github.com/frank-kenfack/CareerQuest');
            """
        )

        # Une meme quete ne peut pas etre validee deux fois par le meme etudiant.
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute(
                """
                INSERT INTO quest_completion (student_id, quest_id, status)
                VALUES (1, 1, 'completed');
                """
            )

        self.connection.execute(
            """
            INSERT INTO external_achievement (student_id, provider, external_key, title, xp_awarded)
            VALUES (1, 'github', 'repo-count-5', '5 depots publics', 75);
            """
        )

        # La synchronisation d'un meme accomplissement externe est idempotente.
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute(
                """
                INSERT INTO external_achievement (student_id, provider, external_key, title, xp_awarded)
                VALUES (1, 'github', 'repo-count-5', '5 depots publics', 75);
                """
            )


if __name__ == "__main__":
    unittest.main()
