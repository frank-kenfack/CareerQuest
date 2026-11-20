import { useState } from "react";
import {
  SchoolLeaderboardEntry,
  StudentLeaderboardEntry,
} from "../types/careerquest";

interface LeaderboardPanelProps {
  studentEntries: StudentLeaderboardEntry[];
  schoolEntries: SchoolLeaderboardEntry[];
  currentUsername?: string;
}

export default function LeaderboardPanel({
  studentEntries,
  schoolEntries,
  currentUsername,
}: LeaderboardPanelProps) {
  const [activeTab, setActiveTab] = useState<"students" | "schools">("students");

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) {
      return "border-amber-400/60 bg-amber-950 text-amber-300";
    }
    if (rank === 2) {
      return "border-slate-300/50 bg-slate-800 text-slate-200";
    }
    if (rank === 3) {
      return "border-orange-500/50 bg-orange-950 text-orange-300";
    }
    return "border-slate-700 bg-slate-900 text-slate-400";
  };

  return (
    <section
      data-testid="leaderboard-panel"
      className="rounded-xl border border-slate-800 bg-slate-900 p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Classements & Compétition (Étudiants & Écoles)
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Comparez votre progression avec les autres étudiants et suivez le score cumulé de chaque établissement.
          </p>
        </div>

        <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-1">
          <button
            type="button"
            data-testid="tab-leaderboard-students"
            onClick={() => setActiveTab("students")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              activeTab === "students"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Classement Étudiants ({studentEntries.length})
          </button>
          <button
            type="button"
            data-testid="tab-leaderboard-schools"
            onClick={() => setActiveTab("schools")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              activeTab === "schools"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Classement Écoles ({schoolEntries.length})
          </button>
        </div>
      </div>

      {activeTab === "students" ? (
        <div className="mt-5 space-y-3">
          {studentEntries.map((entry) => {
            const isCurrentPlayer = currentUsername === entry.username;
            return (
              <div
                key={entry.student_id}
                data-testid={`leaderboard-student-${entry.username}`}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 ${
                  isCurrentPlayer
                    ? "border-emerald-500/60 bg-emerald-950/25"
                    : "border-slate-800 bg-slate-950"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-bold ${getRankBadgeClass(
                      entry.rank
                    )}`}
                  >
                    #{entry.rank}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {entry.username}
                      </span>
                      <span className="rounded bg-indigo-950 px-2 py-0.5 text-[11px] font-semibold uppercase text-indigo-300">
                        Niv. {entry.level} ({entry.visual_tier})
                      </span>
                      {isCurrentPlayer && (
                        <span className="rounded bg-emerald-950 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                          Vous
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {entry.title} | École : {entry.school_name}
                      {entry.school_city ? ` (${entry.school_city})` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <span className="text-slate-400">
                    {entry.unlocked_skills_count} compétences | {entry.completed_quests_count} quêtes
                  </span>
                  <span
                    data-testid={`leaderboard-xp-${entry.username}`}
                    className="rounded-lg border border-emerald-500/40 bg-emerald-950/60 px-3 py-1 font-bold text-emerald-300"
                  >
                    {entry.experience_points} XP
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {schoolEntries.map((schoolEntry) => (
            <div
              key={schoolEntry.school_id}
              data-testid={`leaderboard-school-${schoolEntry.school_name}`}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4"
            >
              <div className="flex items-center gap-4">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-bold ${getRankBadgeClass(
                    schoolEntry.rank
                  )}`}
                >
                  #{schoolEntry.rank}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {schoolEntry.school_name} ({schoolEntry.city})
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {schoolEntry.students_count} étudiants inscrits | Niveau moyen : {schoolEntry.average_level}
                    {schoolEntry.top_student_username
                      ? ` | Major : ${schoolEntry.top_student_username}`
                      : ""}
                  </p>
                </div>
              </div>

              <span className="rounded-lg border border-indigo-500/40 bg-indigo-950/60 px-3 py-1 text-xs font-bold text-indigo-300">
                {schoolEntry.total_experience_points} XP cumulés
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
