# CareerQuest

CareerQuest est une plateforme web de développement professionnel inspirée des jeux de rôle. Chaque compétence acquise, quête validée (projet, formation, certification) ou réalisation synchronisée depuis GitHub et LinkedIn fait progresser l'avatar de l'utilisateur et alimente un classement entre étudiants et écoles.

L'application repose sur une architecture conteneurisée comprenant une interface React, une API REST Python Django et une base de données PostgreSQL.

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

Pour démarrer l'ensemble des services avec Docker Compose :

```bash
docker compose up --build
```

Une fois les conteneurs démarrés, l'interface web est accessible sur `http://localhost:3000` et l'API Django répond sur `http://localhost:8000/api`.

Pour déployer l'application sur un cluster Kubernetes :

```bash
kubectl apply -f k8s/
```
