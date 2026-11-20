# Modèle de données CareerQuest

Ce document décrit le schéma relationnel de l'application **CareerQuest**. Le modèle relie les établissements scolaires, les profils étudiants, l'évolution de leur avatar, l'arbre de compétences, les quêtes et les accomplissements importés depuis GitHub et LinkedIn.

## Diagramme entité-association

```mermaid
erDiagram
    SCHOOL ||--o{ STUDENT_PROFILE : regroupe
    STUDENT_PROFILE ||--|| AVATAR : possede
    SKILL_NODE ||--o{ SKILL_NODE : requiert
    STUDENT_PROFILE ||--o{ UNLOCKED_SKILL : debloque
    SKILL_NODE ||--o{ UNLOCKED_SKILL : reference
    QUEST ||--o{ QUEST_COMPLETION : concerne
    STUDENT_PROFILE ||--o{ QUEST_COMPLETION : accomplit
    SKILL_NODE ||--o{ QUEST : valide
    STUDENT_PROFILE ||--o{ EXTERNAL_ACHIEVEMENT : synchronise

    SCHOOL {
        int id PK
        string name UK
        string city
        datetime created_at
    }

    STUDENT_PROFILE {
        int id PK
        string username UK
        string email UK
        string password_hash
        int school_id FK
        string github_username
        string linkedin_profile_url
        datetime created_at
    }

    AVATAR {
        int id PK
        int student_id FK_UK
        int level
        int experience_points
        string title
        string visual_tier
        datetime updated_at
    }

    SKILL_NODE {
        int id PK
        string code UK
        string name
        string category
        string description
        int xp_reward
        int required_level
        int parent_skill_id FK
    }

    UNLOCKED_SKILL {
        int id PK
        int student_id FK
        int skill_id FK
        datetime unlocked_at
    }

    QUEST {
        int id PK
        string code UK
        string title
        string quest_type
        string description
        int xp_reward
        int related_skill_id FK
    }

    QUEST_COMPLETION {
        int id PK
        int student_id FK
        int quest_id FK
        string status
        string proof_url
        datetime completed_at
    }

    EXTERNAL_ACHIEVEMENT {
        int id PK
        int student_id FK
        string provider
        string external_key
        string title
        int xp_awarded
        datetime synced_at
    }
```

## Règles d'intégrité métier

Un profil étudiant possède exactement un **avatar**, initialisé au niveau 1 avec 0 point d'expérience et le palier visuel « novice ». Chaque tranche de 100 points d'expérience fait monter l'avatar d'un niveau et met à jour son palier visuel (`novice`, `apprenti`, `confirmé`, `maître`).

Un noeud de compétence (`skill_node`) peut référencer une compétence parente (`parent_skill_id`). Le déblocage d'une compétence dans `unlocked_skill` est unique par couple `(student_id, skill_id)` et exige que la compétence parente soit déjà débloquée par l'étudiant.

Une quête (`quest`) appartient à l'un des trois types prévus par le cahier des charges : `project`, `training` ou `certification`. La table `quest_completion` garantit par une contrainte d'unicité `(student_id, quest_id)` qu'un étudiant ne reçoit la récompense d'expérience qu'une seule fois par quête validée.

Les accomplissements externes (`external_achievement`) proviennent de `github` ou `linkedin`. La contrainte d'unicité `(student_id, provider, external_key)` rend la synchronisation idempotente lors des appels successifs aux API tierces.
