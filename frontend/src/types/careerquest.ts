export type AvatarVisualTier = "novice" | "apprenti" | "confirme" | "maitre";

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

export interface HealthStatusPayload {
  status: string;
  service: string;
  database: string;
  database_engine?: string;
  registered_students_count?: number;
}
