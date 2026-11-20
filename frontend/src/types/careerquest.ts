export type AvatarVisualTier = "novice" | "apprenti" | "confirme" | "maitre";

export type SkillCategory = "frontend" | "backend" | "devops" | "cloud";

export type QuestCategory = "project" | "training" | "certification";

export type QuestProgressStatus = "not_started" | "in_progress" | "completed";

export interface SchoolInfo {
  id: number;
  name: string;
  city: string;
}

export interface AvatarState {
  level: number;
  experience_points: number;
  xp_for_next_level: number;
  current_level_progress_percent: number;
  title: string;
  visual_tier: AvatarVisualTier;
  updated_at?: string;
}

export interface StudentProfile {
  id: number;
  username: string;
  email: string;
  school: SchoolInfo | null;
  github_username: string;
  linkedin_profile_url: string;
  avatar: AvatarState;
  created_at?: string;
}

export interface AvatarTierDefinition {
  min_level: number;
  min_xp: number;
  visual_tier: AvatarVisualTier;
  title: string;
}

export interface ProgressionTiersPayload {
  xp_per_level: number;
  tiers: AvatarTierDefinition[];
}

export interface SkillNodeItem {
  id: number;
  code: string;
  name: string;
  category: SkillCategory;
  description: string;
  xp_reward: number;
  required_level: number;
  parent_skill_id: number | null;
  parent_skill_code: string | null;
  parent_skill_name: string | null;
  is_unlocked: boolean;
  is_available: boolean;
}

export interface QuestItem {
  id: number;
  code: string;
  title: string;
  quest_type: QuestCategory;
  description: string;
  xp_reward: number;
  related_skill_id: number | null;
  related_skill_code: string | null;
  related_skill_name: string | null;
  student_status: QuestProgressStatus;
  proof_url: string;
  completed_at: string | null;
}

export interface ExternalAchievementItem {
  id: number;
  provider: "github" | "linkedin";
  external_key: string;
  title: string;
  xp_awarded: number;
  synced_at: string;
}

export interface StudentLeaderboardEntry {
  rank: number;
  student_id: number;
  username: string;
  school_name: string;
  school_city: string;
  level: number;
  experience_points: number;
  title: string;
  visual_tier: AvatarVisualTier;
  unlocked_skills_count: number;
  completed_quests_count: number;
}

export interface SchoolLeaderboardEntry {
  rank: number;
  school_id: number;
  school_name: string;
  city: string;
  students_count: number;
  total_experience_points: number;
  average_level: number;
  top_student_username: string;
}

export interface HealthStatusPayload {
  status: string;
  service: string;
  database: string;
  database_engine?: string;
  registered_students_count?: number;
}
