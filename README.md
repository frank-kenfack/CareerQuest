# CareerQuest

CareerQuest est une plateforme web de développement professionnel inspirée des jeux de rôle (RPG). Elle transforme l'apprentissage technique et la valorisation du parcours étudiant en une progression mesurable : chaque compétence débloquée dans l'arbre technique, chaque quête validée avec preuve (projet, formation ou certification) et chaque accomplissement importé depuis GitHub ou LinkedIn attribue des points d'expérience (XP) à l'avatar du joueur et met à jour les classements entre étudiants et entre établissements.

## Présentation détaillée du travail réalisé

Le développement a été mené de manière incrémentale sur cinq jours, avec une branche Git dédiée et une suite de tests automatisés pour chaque fonctionnalité métier et chaque brique d'infrastructure.

### 1. Modélisation relationnelle et socle Backend Django REST

Le modèle de données repose sur huit tables métier définies dans `docs/modele_donnees.md`, `docs/schema.sql` et `backend/progression/models.py` :
- `school` : établissements d'enseignement supérieur rattachés aux étudiants.
- `student_profile` : profil professionnel reliant le compte utilisateur Django (`auth_user`) à son école, son identifiant GitHub et l'URL de son profil LinkedIn.
- `avatar` : état de progression du joueur (niveau actuel, points d'expérience cumulés, titre honorifique et palier visuel).
- `skill_node` et `unlocked_skill` : catalogue des compétences techniques structuré par branches avec lien de parenté (`parent_skill_id`) et historique des déblocages par étudiant.
- `quest` et `quest_completion` : catalogue des quêtes classées par catégorie (`project`, `training`, `certification`), compétence associée et suivi de l'état d'avancement (`in_progress`, `completed`) avec URL de preuve.
- `external_achievement` : accomplissements externes synchronisés depuis GitHub et LinkedIn avec clé d'unicité (`student`, `provider`, `external_key`) garantissant l'idempotence des gains d'expérience.

L'API REST est développée avec Python 3.12, Django 5.1, Django REST Framework et SimpleJWT. Elle expose vingt points de terminaison couvrant la supervision (`/api/health/`), l'authentification JWT (`/api/auth/register/`, `/api/auth/login/`, `/api/auth/refresh/`, `/api/auth/me/`, `/api/schools/`), l'évolution de l'avatar (`/api/avatar/progression-tiers/`, `/api/avatar/award-xp/`), l'arbre de compétences (`/api/skills/`, `/api/skills/<id>/unlock/`), le journal de quêtes (`/api/quests/`, `/api/quests/<id>/start/`, `/api/quests/<id>/complete/`), les intégrations tierces (`/api/integrations/achievements/`, `/api/integrations/github/sync/`, `/api/integrations/linkedin/sync/`) et les classements (`/api/leaderboard/students/`, `/api/leaderboard/schools/`).

### 2. Moteur d'évolution de l'avatar et fonctionnalités RPG

Le moteur de progression calcule automatiquement le niveau selon la formule `niveau = 1 + (XP // 100)` (100 XP par niveau) et fait évoluer l'apparence ainsi que le titre de l'avatar à travers quatre paliers :
- Niveau 1 et plus (dès 0 XP) : palier `novice` (« Novice »).
- Niveau 3 et plus (dès 200 XP) : palier `apprenti` (« Apprenti DevOps »).
- Niveau 5 et plus (dès 400 XP) : palier `confirme` (« Ingenieur Cloud Confirme »).
- Niveau 8 et plus (dès 700 XP) : palier `maitre` (« Maitre Architecte Fullstack »).

L'arbre de compétences comporte huit noeuds répartis sur quatre branches (`frontend`, `backend`, `devops`, `cloud`). Le déblocage d'un noeud enfant vérifie que le joueur a atteint le niveau requis et qu'il a préalablement débloqué le noeud parent. Le journal de quêtes propose six missions techniques couvrant les projets, les formations et les certifications ; la validation d'une quête exige un lien de preuve (dépôt Git ou certificat) et crédite l'expérience une seule fois.

### 3. Intégrations GitHub, LinkedIn et compétition inter-écoles

La synchronisation GitHub (`backend/progression/github_sync.py`) interroge en direct l'API publique `https://api.github.com/users/<username>/repos` pour analyser le nombre de dépôts publics, les langages utilisés (Python, TypeScript, JavaScript, Dockerfile, Shell) et la présence du dépôt `CareerQuest`, attribuant jusqu'à quatre accomplissements distincts. L'intégration LinkedIn valide le format de l'URL professionnelle (`linkedin.com/in/`) et importe les certifications déclarées avec leur organisme émetteur.

Le module de compétition agrège en temps réel les scores individuels et collectifs : le classement étudiant trie les profils par expérience décroissante avec le détail des compétences et quêtes validées, tandis que le classement des écoles cumule l'expérience de leurs étudiants, calcule le niveau moyen et identifie le meilleur contributeur de chaque établissement.

### 4. Interface Frontend React, TypeScript et Nginx

L'interface utilisateur (`frontend/src/`) est construite avec React 18, TypeScript, Vite et Tailwind CSS. Elle regroupe sept composants métier dédiés :
- `AuthenticationPanel.tsx` : formulaires de connexion et d'inscription avec sélection ou création d'école.
- `AvatarCard.tsx` : représentation SVG évolutive de l'avatar selon son palier (`novice`, `apprenti`, `confirme`, `maitre`), barre de progression vers le niveau suivant et bannière de notification lors d'un gain d'expérience ou d'un passage de niveau.
- `SkillTreeBoard.tsx` : tableau interactif des quatre branches de compétences avec filtrage, indicateurs d'état (`ACQUIS`, `DISPONIBLE`, `VERROUILLÉ`), inspecteur de prérequis et déblocage en un clic.
- `QuestLogPanel.tsx` : journal filtrable par catégorie permettant de démarrer une quête et de soumettre l'URL de preuve pour la valider.
- `GithubSyncPanel.tsx` et `LinkedinSyncPanel.tsx` : panneaux de synchronisation externe et historique des accomplissements débloqués.
- `LeaderboardPanel.tsx` et `KubernetesArchitecturePanel.tsx` : podiums étudiants et écoles, barre de navigation rapide, indicateur de persistance PostgreSQL et synthèse de l'architecture Kubernetes.

## Étapes de configuration réalisées pour l'infrastructure et le DevOps

L'architecture technique a été configurée autour de quatre piliers :

1. Conteneurisation multi-services ([docker-compose.yml](docker-compose.yml)) :
   - Conteneur `db` (`postgres:16-alpine`) configuré avec le volume persistant `postgres_storage:/var/lib/postgresql/data` et une sonde de santé `pg_isready` toutes les 5 secondes.
   - Conteneur `backend` ([backend/Dockerfile](backend/Dockerfile)) basé sur `python:3.12-slim`, exécuté sous un utilisateur non privilégié (`appuser`) via Gunicorn sur le port `8000`. Son script d'entrée ([backend/entrypoint.sh](backend/entrypoint.sh)) applique automatiquement les migrations (`python manage.py migrate --noinput`) et peuple le jeu de démonstration idempotent (`python manage.py seed_demo`) avant de démarrer le serveur WSGI.
   - Conteneur `frontend` ([frontend/Dockerfile](frontend/Dockerfile)) construit en deux étapes : une étape `node:20-alpine` qui exécute systématiquement les tests unitaires Vitest (`npm test`) avant de compiler les ressources (`npm run build`), puis une étape `nginx:1.27-alpine` ([frontend/nginx.conf](frontend/nginx.conf)) exposée sur le port `3000` qui sert l'application React et redirige les appels `/api/` vers `http://backend:8000/api/`.

2. Configuration par variables d'environnement ([.env.example](.env.example)) :
   - Séparation complète de la configuration et du code (identifiants PostgreSQL, clé secrète Django, hôtes autorisés, origines CORS et URL de l'API).

3. Pipelines CI/CD ([.gitlab-ci.yml](.gitlab-ci.yml) et [.github/workflows/ci.yml](.github/workflows/ci.yml)) :
   - Quatre étapes automatisées (`validate`, `test`, `build`, `deploy`) vérifiant le schéma SQL, les manifestes Kubernetes, la syntaxe Bash du script CD (`sh -n scripts/deploy-k8s.sh`), la synchronisation des migrations Django (`makemigrations --check --dry-run`), les tests Django sur PostgreSQL 16, les tests Vitest React et la construction des images Docker.

4. Orchestration Kubernetes ([k8s/](k8s/)) :
   - Onze manifestes couvrant l'espace de noms `careerquest` (`namespace.yaml`), la configuration non sensible (`configmap.yaml`), les secrets (`secrets.yaml`), la réclamation de volume persistant de 5 Gi (`postgres-pvc.yaml`), les trois déploiements avec sondes `readinessProbe` et `livenessProbe` (`postgres-deployment.yaml`, `backend-deployment.yaml` à 2 réplicas, `frontend-deployment.yaml` à 2 réplicas), les trois services ClusterIP (`postgres-service.yaml`, `backend-service.yaml`, `frontend-service.yaml`) et le routage externe (`ingress.yaml` sous classe `nginx` pour l'hôte `careerquest.local`).

## Installation

Cette section détaille la procédure complète pour cloner et configurer le projet sur un nouveau poste de travail.

### Prérequis sur le nouveau poste

- Git installé et configuré.
- Docker Desktop (Windows ou macOS) ou Docker Engine avec le greffon Docker Compose (Linux) en cours d'exécution.
- Python 3.12 (optionnel sur l'hôte, utilisé uniquement pour lancer le script global d'audit `scripts/run_ci_checks.py` depuis le système hôte ; tous les moteurs applicatifs Python et Node.js s'exécutent directement dans les conteneurs Docker).

### 1. Cloner le dépôt depuis GitHub

Ouvrir un terminal (PowerShell, Bash ou Zsh) sur le nouveau poste et exécuter :

```bash
git clone https://github.com/frank-kenfack/CareerQuest.git
cd CareerQuest
```

Par défaut, le dépôt s'ouvre sur la branche stable `main`. Pour basculer sur la branche d'intégration `develop`, utiliser `git checkout develop`.

### 2. Créer et configurer le fichier `.env`

Créer le fichier `.env` à la racine du projet à partir du modèle `.env.example` :

Sous Linux, macOS ou Git Bash :

```bash
cp .env.example .env
```

Sous Windows PowerShell :

```powershell
Copy-Item .env.example .env
```

Le fichier `.env` contient les paramètres suivants, prêts à l'emploi pour un lancement local avec Docker Compose :

| Variable | Valeur par défaut dans `.env.example` | Rôle |
| :--- | :--- | :--- |
| `POSTGRES_DB` | `careerquest` | Nom de la base de données PostgreSQL 16 |
| `POSTGRES_USER` | `careerquest_user` | Utilisateur PostgreSQL |
| `POSTGRES_PASSWORD` | `careerquest_password` | Mot de passe PostgreSQL |
| `POSTGRES_HOST` | `db` | Nom du service Docker PostgreSQL sur le réseau interne |
| `POSTGRES_PORT` | `5432` | Port interne PostgreSQL |
| `DJANGO_SECRET_KEY` | `change-me-in-production` | Clé cryptographique Django (signature des jetons JWT) |
| `DJANGO_DEBUG` | `True` | Mode de débogage Django (`False` en production) |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1,backend` | Hôtes HTTP autorisés par Django |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Origines Frontend autorisées par `django-cors-headers` |
| `VITE_API_URL` | `http://localhost:8000/api` | URL de base de l'API REST appelée par l'interface React |

## Lancement

### 1. Démarrer l'application avec Docker Compose

Lancer la construction des images et le démarrage des trois conteneurs en arrière-plan :

```bash
docker compose up -d --build
```

Lors de cette commande :
1. Docker télécharge l'image `postgres:16-alpine`, crée le volume persistant `postgres_storage` et attend que PostgreSQL accepte les connexions.
2. Le conteneur `frontend` installe les dépendances Node.js, exécute les 7 tests composants Vitest, compile le code React/TypeScript et démarre Nginx sur le port `3000`.
3. Le conteneur `backend` applique les 4 migrations Django sur PostgreSQL, exécute `python manage.py seed_demo` pour peupler la base de démonstration, puis démarre Gunicorn sur le port `8000`.

Pour vérifier que les trois conteneurs sont actifs :

```bash
docker compose ps
```

Accès aux services sur le poste local :
- Interface web React (via Nginx) : `http://localhost:3000`
- Point de santé de l'API Django : `http://localhost:8000/api/health/`
- Catalogue des compétences (JSON) : `http://localhost:8000/api/skills/`
- Catalogue des quêtes (JSON) : `http://localhost:8000/api/quests/`
- Classements étudiants et écoles (JSON) : `http://localhost:8000/api/leaderboard/students/` et `http://localhost:8000/api/leaderboard/schools/`

### 2. Comptes de démonstration préconfigurés

Au démarrage, la commande idempotente `seed_demo` crée automatiquement quatre écoles (`Epitech Digital`, `IMT Atlantique`, `INSA Lyon`, `CentraleSupelec`), huit compétences, six quêtes et cinq comptes étudiants permettant de tester immédiatement l'application sur `http://localhost:3000` (ou de créer un nouveau compte via l'onglet « Inscription ») :

| Nom d'utilisateur | Mot de passe | École | Palier d'avatar initial |
| :--- | :--- | :--- | :--- |
| `frank_devops` | `StrongPassword2026!` | Epitech Digital (Paris) | `maitre` (Maitre Architecte Fullstack) |
| `lina_cloud` | `StrongPassword2026!` | IMT Atlantique (Nantes) | `confirme` (Ingenieur Cloud Confirme) |
| `chloe_fullstack` | `StrongPassword2026!` | INSA Lyon (Lyon) | `confirme` (Ingenieur Cloud Confirme) |
| `maxime_k8s` | `StrongPassword2026!` | CentraleSupelec (Gif-sur-Yvette) | `apprenti` (Apprenti DevOps) |
| `yanis_secops` | `StrongPassword2026!` | Epitech Digital (Paris) | `novice` (Novice) |

### 3. Exécuter les tests automatisés et le contrôle de persistance

Pour lancer le script complet de vérification CI (tests de schéma et d'infrastructure, vérification des migrations Django, 23 tests d'intégration Django sur PostgreSQL 16, contrôles HTTP sur les ports `8000` et `3000`, et test de persistance après redémarrage des conteneurs `db` et `backend`) :

```bash
python scripts/run_ci_checks.py
```

Pour exécuter uniquement la suite de tests Django directement à l'intérieur du conteneur Backend (sans Python installé sur l'hôte) :

```bash
docker compose exec backend python manage.py test -v 2
```

### 4. Déployer sur un cluster Kubernetes

Pour appliquer séquentiellement les onze manifestes du dossier `k8s/` et vérifier le déploiement des pods sur un cluster Kubernetes (Docker Desktop Kubernetes, Minikube ou kind) :

```bash
sh scripts/deploy-k8s.sh
```

Il est également possible d'appliquer directement le dossier des manifestes :

```bash
kubectl apply -f k8s/
```

### 5. Arrêter ou réinitialiser les conteneurs

Pour mettre les trois conteneurs à l'arrêt tout en conservant les données PostgreSQL :

```bash
docker compose stop
```

Pour les relancer ultérieurement sans perte de données :

```bash
docker compose start
```

## Bilan et résultats obtenus à la fin du projet

À l'issue des cinq jours de développement, le projet aboutit aux résultats suivants :

- Les cinq fonctionnalités attendues par le sujet (avatar évolutif sur quatre paliers, arbre de compétences à prérequis, système de quêtes avec preuve, intégrations GitHub et LinkedIn, classements entre étudiants et écoles) sont opérationnelles de bout en bout entre l'interface React et la base PostgreSQL 16.
- L'architecture à trois conteneurs isolés (`frontend`, `backend`, `db`) démarre en une seule commande (`docker compose up -d --build`), peuple automatiquement ses données de démonstration et conserve l'intégralité des profils, compétences, quêtes et points d'expérience après redémarrage des conteneurs grâce au volume persistant `postgres_storage`.
- La qualité et la non-régression sont vérifiées par **44 tests automatisés** (14 tests d'infrastructure, de schéma SQL, de manifestes Kubernetes et de documentation, 23 tests d'intégration Django REST sur PostgreSQL 16 et 7 tests unitaires Vitest côté React), complétés par 10 contrôles de contrats HTTP en direct sur le Backend (`:8000`) et le Reverse Proxy Nginx (`:3000`).
- Le déploiement en production est préparé par les pipelines CI/CD GitLab et GitHub Actions ainsi que par les onze manifestes Kubernetes du répertoire `k8s/` (Namespace, ConfigMap, Secrets, PersistentVolumeClaim de 5 Gi, Deployments répliqués avec sondes de santé, Services et Ingress Nginx).
