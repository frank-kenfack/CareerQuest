from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.db import models


AVATAR_PROGRESSION_TIERS = [
    {
        "min_level": 1,
        "min_xp": 0,
        "visual_tier": "novice",
        "title": "Novice",
    },
    {
        "min_level": 3,
        "min_xp": 200,
        "visual_tier": "apprenti",
        "title": "Apprenti DevOps",
    },
    {
        "min_level": 5,
        "min_xp": 400,
        "visual_tier": "confirme",
        "title": "Ingenieur Cloud Confirme",
    },
    {
        "min_level": 8,
        "min_xp": 700,
        "visual_tier": "maitre",
        "title": "Maitre Architecte Fullstack",
    },
]

DEFAULT_SKILL_TREE_NODES = [
    {
        "code": "react-components",
        "name": "Composants React & TypeScript",
        "category": "frontend",
        "description": "Concevoir des interfaces modulaires typees avec gestion d'etat et hooks.",
        "xp_reward": 100,
        "required_level": 1,
        "parent_code": None,
    },
    {
        "code": "react-architecture",
        "name": "Architecture SPA & Tests Vitest",
        "category": "frontend",
        "description": "Industrialiser les tests composants, le routage et l'optimisation de build Vite.",
        "xp_reward": 150,
        "required_level": 2,
        "parent_code": "react-components",
    },
    {
        "code": "django-rest-api",
        "name": "API REST Django & Modelisation SQL",
        "category": "backend",
        "description": "Structurer des points de terminaison RESTful connectes a PostgreSQL.",
        "xp_reward": 100,
        "required_level": 1,
        "parent_code": None,
    },
    {
        "code": "jwt-security",
        "name": "Securite JWT & Transactions PostgreSQL",
        "category": "backend",
        "description": "Proteger les ressources par jetons signes et garantir l'atomicite des ecritures.",
        "xp_reward": 150,
        "required_level": 2,
        "parent_code": "django-rest-api",
    },
    {
        "code": "docker-containers",
        "name": "Conteneurisation Docker Multi-Services",
        "category": "devops",
        "description": "Isoler les services applicatifs avec des images multi-etapes et des healthchecks.",
        "xp_reward": 100,
        "required_level": 1,
        "parent_code": None,
    },
    {
        "code": "gitlab-cicd",
        "name": "Pipelines GitLab CI & GitHub Actions",
        "category": "devops",
        "description": "Automatiser la validation, les tests unitaires et la construction des images.",
        "xp_reward": 150,
        "required_level": 2,
        "parent_code": "docker-containers",
    },
    {
        "code": "cloud-networking",
        "name": "Reseaux Cloud, Nginx & Reverse Proxy",
        "category": "cloud",
        "description": "Configurer le routage HTTP, la repartition de charge et l'exposition des services.",
        "xp_reward": 100,
        "required_level": 1,
        "parent_code": None,
    },
    {
        "code": "kubernetes-cluster",
        "name": "Orchestration Kubernetes, Ingress & PVC",
        "category": "cloud",
        "description": "Deployer des charges de travail resilientes avec stockage persistant sur cluster.",
        "xp_reward": 200,
        "required_level": 3,
        "parent_code": "cloud-networking",
    },
]


class School(models.Model):
    name = models.CharField(max_length=150, unique=True)
    city = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "school"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.city})"


class StudentProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="student_profile",
    )
    school = models.ForeignKey(
        School,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="students",
    )
    github_username = models.CharField(max_length=100, blank=True, default="")
    linkedin_profile_url = models.URLField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "student_profile"

    def __str__(self):
        return self.user.username


class Avatar(models.Model):
    XP_PER_LEVEL = 100

    VISUAL_TIER_CHOICES = [
        ("novice", "Novice"),
        ("apprenti", "Apprenti"),
        ("confirme", "Confirme"),
        ("maitre", "Maitre"),
    ]

    student = models.OneToOneField(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="avatar",
    )
    level = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
    )
    experience_points = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)],
    )
    title = models.CharField(max_length=100, default="Novice")
    visual_tier = models.CharField(
        max_length=50,
        choices=VISUAL_TIER_CHOICES,
        default="novice",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "avatar"

    def __str__(self):
        return f"{self.student.user.username} - Niveau {self.level} ({self.title})"

    @property
    def xp_for_next_level(self):
        return self.level * self.XP_PER_LEVEL

    @property
    def current_level_progress_percent(self):
        return self.experience_points % self.XP_PER_LEVEL

    @classmethod
    def resolve_tier_for_level(cls, target_level):
        selected_tier = AVATAR_PROGRESSION_TIERS[0]
        for tier_definition in AVATAR_PROGRESSION_TIERS:
            if target_level >= tier_definition["min_level"]:
                selected_tier = tier_definition
        return selected_tier

    def recalculate_progression(self):
        computed_level = 1 + (self.experience_points // self.XP_PER_LEVEL)
        matched_tier = self.resolve_tier_for_level(computed_level)
        self.level = computed_level
        self.visual_tier = matched_tier["visual_tier"]
        self.title = matched_tier["title"]

    def award_experience(self, earned_xp):
        if earned_xp <= 0:
            raise ValueError("Les points d'experience attribues doivent etre strictement positifs.")

        previous_level = self.level
        previous_tier = self.visual_tier

        self.experience_points += earned_xp
        self.recalculate_progression()
        self.save()

        return {
            "previous_level": previous_level,
            "new_level": self.level,
            "leveled_up": self.level > previous_level,
            "previous_tier": previous_tier,
            "visual_tier": self.visual_tier,
            "tier_evolved": self.visual_tier != previous_tier,
            "title": self.title,
            "experience_points": self.experience_points,
            "xp_for_next_level": self.xp_for_next_level,
            "current_level_progress_percent": self.current_level_progress_percent,
        }


class SkillNode(models.Model):
    CATEGORY_CHOICES = [
        ("frontend", "Frontend"),
        ("backend", "Backend"),
        ("devops", "DevOps"),
        ("cloud", "Cloud"),
    ]

    code = models.CharField(max_length=60, unique=True)
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    description = models.TextField()
    xp_reward = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    required_level = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
    )
    parent_skill = models.ForeignKey(
        "self",
        on_delete=models.RESTRICT,
        null=True,
        blank=True,
        related_name="child_skills",
    )

    class Meta:
        db_table = "skill_node"
        ordering = ["category", "required_level", "id"]

    def __str__(self):
        return f"{self.name} ({self.category})"


class UnlockedSkill(models.Model):
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="unlocked_skills",
    )
    skill = models.ForeignKey(
        SkillNode,
        on_delete=models.CASCADE,
        related_name="unlock_records",
    )
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "unlocked_skill"
        unique_together = [("student", "skill")]
        ordering = ["unlocked_at"]

    def __str__(self):
        return f"{self.student.user.username} -> {self.skill.code}"


def ensure_default_skill_tree():
    created_nodes_by_code = {}
    for node_spec in DEFAULT_SKILL_TREE_NODES:
        parent_instance = None
        if node_spec["parent_code"]:
            parent_instance = created_nodes_by_code.get(node_spec["parent_code"]) or SkillNode.objects.filter(
                code=node_spec["parent_code"]
            ).first()

        skill_node, _ = SkillNode.objects.update_or_create(
            code=node_spec["code"],
            defaults={
                "name": node_spec["name"],
                "category": node_spec["category"],
                "description": node_spec["description"],
                "xp_reward": node_spec["xp_reward"],
                "required_level": node_spec["required_level"],
                "parent_skill": parent_instance,
            },
        )
        created_nodes_by_code[node_spec["code"]] = skill_node
