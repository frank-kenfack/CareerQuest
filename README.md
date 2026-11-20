# CareerQuest

CareerQuest est une plateforme web de développement professionnel inspirée des jeux de rôle. Chaque compétence débloquée dans l'arbre technique, chaque quête validée avec preuve (projet, formation ou certification) et chaque réalisation synchronisée depuis GitHub ou LinkedIn attribue de l'expérience à l'avatar évolutif de l'étudiant et met à jour les classements entre étudiants et écoles.

L'application repose sur trois conteneurs isolés : une interface React servie par Nginx en reverse proxy, une API REST Python Django exécutée par Gunicorn et une base de données PostgreSQL 16 dotée d'un volume persistant.

## Installation

1. Cloner le dépôt et accéder au répertoire du projet :

```bash
git clone https://github.com/frank-kenfack/CareerQuest.git
cd CareerQuest
```

2. Créer le fichier de configuration à partir du modèle fourni :

```bash
cp .env.example .env
```

## Lancement

Pour démarrer les trois conteneurs en arrière-plan avec Docker Compose (les migrations PostgreSQL et le jeu de démonstration `seed_demo` s'exécutent automatiquement au démarrage) :

```bash
docker compose up -d --build
```

Une fois les conteneurs actifs, l'interface web répond sur `http://localhost:3000` et l'API Django est accessible sur `http://localhost:8000/api/health/`.

Pour exécuter la suite complète de tests automatisés et le contrôle de persistance PostgreSQL :

```bash
python scripts/run_ci_checks.py
```

Pour déployer les onze manifestes sur un cluster Kubernetes :

```bash
sh scripts/deploy-k8s.sh
```
