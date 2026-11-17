CREATE TABLE school (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(150) NOT NULL UNIQUE,
    city VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(150) NOT NULL UNIQUE,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    school_id INTEGER REFERENCES school(id) ON DELETE SET NULL,
    github_username VARCHAR(100),
    linkedin_profile_url VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE avatar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL UNIQUE REFERENCES student_profile(id) ON DELETE CASCADE,
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
    experience_points INTEGER NOT NULL DEFAULT 0 CHECK (experience_points >= 0),
    title VARCHAR(100) NOT NULL DEFAULT 'Novice',
    visual_tier VARCHAR(50) NOT NULL DEFAULT 'novice' CHECK (visual_tier IN ('novice', 'apprenti', 'confirme', 'maitre')),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE skill_node (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('frontend', 'backend', 'devops', 'cloud')),
    description TEXT NOT NULL,
    xp_reward INTEGER NOT NULL CHECK (xp_reward > 0),
    required_level INTEGER NOT NULL DEFAULT 1 CHECK (required_level >= 1),
    parent_skill_id INTEGER REFERENCES skill_node(id) ON DELETE RESTRICT
);

CREATE TABLE unlocked_skill (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES student_profile(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skill_node(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, skill_id)
);

CREATE TABLE quest (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(60) NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    quest_type VARCHAR(30) NOT NULL CHECK (quest_type IN ('project', 'training', 'certification')),
    description TEXT NOT NULL,
    xp_reward INTEGER NOT NULL CHECK (xp_reward > 0),
    related_skill_id INTEGER REFERENCES skill_node(id) ON DELETE SET NULL
);

CREATE TABLE quest_completion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES student_profile(id) ON DELETE CASCADE,
    quest_id INTEGER NOT NULL REFERENCES quest(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('in_progress', 'completed')),
    proof_url VARCHAR(255),
    completed_at TIMESTAMP,
    UNIQUE (student_id, quest_id)
);

CREATE TABLE external_achievement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES student_profile(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL CHECK (provider IN ('github', 'linkedin')),
    external_key VARCHAR(120) NOT NULL,
    title VARCHAR(150) NOT NULL,
    xp_awarded INTEGER NOT NULL CHECK (xp_awarded > 0),
    synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, provider, external_key)
);
