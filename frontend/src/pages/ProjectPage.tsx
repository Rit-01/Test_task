import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, getStoredUser, getToken } from "@/lib/api-client";
import { Header } from "@/components/Header";
import { StatusColumn } from "@/components/StatusColumn";
import { TaskDetail } from "@/components/TaskDetail";
import type { ApiProjectDetail, ApiTask, TaskStatus } from "@/types";
import { STATUS_ORDER } from "@/types";

function formatActivityTime(rawDate?: string) {
  if (!rawDate) return "Recently";
  const parsed = new Date(rawDate);
  if (isNaN(parsed.getTime())) return "Recently";
  return parsed.toLocaleString();
}

export default function ProjectPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [activeTask, setActiveTask] = useState<ApiTask | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newColumn, setNewColumn] = useState<TaskStatus>("todo");
  const [error, setError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) navigate("/login", { replace: true });
  }, [navigate]);

  const currentUser = getStoredUser();

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ["project", id],
    queryFn: () => apiFetch<{ project: ApiProjectDetail }>(`/api/projects/${id}`),
  });

  const createTask = useMutation({
    mutationFn: (input: { title: string; status: TaskStatus }) =>
      apiFetch<{ task: ApiTask }>(`/api/projects/${id}/tasks`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      setNewTitle("");
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "create failed"),
  });

  const exportAirtable = useMutation({
    mutationFn: () =>
      apiFetch<{ exported: number; created: number; updated: number; failed: number }>(
        `/api/projects/${id}/export`,
        { method: "POST" }
      ),
    onSuccess: (res) => {
      setExportMessage(
        `Export complete! ${res.exported} tasks exported (${res.created} created, ${res.updated} updated, ${res.failed} failed).`
      );
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
    onError: (err) =>
      setExportMessage(err instanceof Error ? err.message : "Export failed"),
  });

  const project = data?.project;
  const userMembership = project?.memberships.find(
    (m) => m.user.id === currentUser?.id || m.user.email === currentUser?.email
  );
  const userRole = userMembership?.role ?? "viewer";
  const canEdit = userRole === "admin" || userRole === "member";

  const tasksByStatus: Record<TaskStatus, ApiTask[]> = {
    todo: [],
    in_progress: [],
    review: [],
    done: [],
  };
  if (project) {
    for (const t of project.tasks) {
      tasksByStatus[t.status].push(t);
    }
  }

  const activities = project?.activities || [];

  return (
    <div className="min-h-screen pb-12">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Link
          to="/dashboard"
          className="text-sm text-muted hover:text-white"
        >
          ← all projects
        </Link>

        {isLoading && <p className="text-muted text-sm mt-6">loading…</p>}
        {queryError && (
          <p className="text-sm text-red-400 mt-6">
            {queryError instanceof Error ? queryError.message : "failed to load"}
          </p>
        )}

        {project && (
          <>
            <div className="flex items-start justify-between mt-4 mb-8">
              <div>
                <h1 className="text-2xl font-semibold">{project.name}</h1>
                {project.description && (
                  <p className="text-sm text-muted mt-1 max-w-2xl">
                    {project.description}
                  </p>
                )}
                <p className="text-xs text-muted mt-2">
                  owner: {project.owner.name} · {project.memberships.length} members · your role: <span className="font-semibold text-accent">{userRole}</span>
                </p>
              </div>

              {canEdit && (
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => {
                      setExportMessage(null);
                      exportAirtable.mutate();
                    }}
                    disabled={exportAirtable.isPending}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-md px-3.5 py-2 flex items-center gap-1.5 disabled:opacity-50 transition shadow-sm"
                  >
                    {exportAirtable.isPending ? "Exporting…" : "Export to Airtable"}
                  </button>
                  {exportMessage && (
                    <div className="bg-emerald-950/70 border border-emerald-800/80 rounded-md px-3 py-1.5 text-xs text-emerald-300 flex items-center justify-between gap-3 shadow-md max-w-md">
                      <span className="whitespace-normal leading-relaxed">{exportMessage}</span>
                      <button
                        onClick={() => setExportMessage(null)}
                        className="text-emerald-400 hover:text-emerald-100 font-bold px-1"
                        title="Dismiss"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {canEdit ? (
              <section className="bg-surface border border-border rounded-lg p-4 mb-6">
                <h2 className="text-sm font-medium mb-3">add a task</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newTitle.trim()) return;
                    setError(null);
                    createTask.mutate({ title: newTitle.trim(), status: newColumn });
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="task title"
                    className="flex-1 rounded-md bg-bg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                  <select
                    value={newColumn}
                    onChange={(e) => setNewColumn(e.target.value as TaskStatus)}
                    className="rounded-md bg-bg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={createTask.isPending}
                    className="bg-accent hover:bg-indigo-500 text-white text-sm font-medium rounded-md px-4 disabled:opacity-50"
                  >
                    add
                  </button>
                </form>
                {error && (
                  <p className="text-sm text-red-400 mt-2" role="alert">
                    {error}
                  </p>
                )}
              </section>
            ) : (
              <div className="bg-surface/50 border border-border/50 rounded-lg p-3 mb-6 text-xs text-muted">
                You are a viewer on this project. Task creation and edits are restricted to project members and admins.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {STATUS_ORDER.map((s) => (
                <StatusColumn
                  key={s}
                  status={s}
                  tasks={tasksByStatus[s]}
                  onTaskClick={setActiveTask}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
              {/* Members Section */}
              <section className="lg:col-span-1">
                <h2 className="text-sm font-medium mb-3">members</h2>
                <ul className="bg-surface border border-border rounded-lg divide-y divide-border">
                  {project.memberships.map((m) => (
                    <li
                      key={m.id}
                      className="px-4 py-3 flex items-center justify-between text-sm"
                    >
                      <span>{m.user.name}</span>
                      <span className="text-xs text-muted">
                        {m.user.email} · {m.role}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Activity Feed Section (Part 3b) */}
              <section className="lg:col-span-2">
                <h2 className="text-sm font-medium mb-3">recent activity feed</h2>
                <div className="bg-surface border border-border rounded-lg p-4 max-h-72 overflow-y-auto space-y-3">
                  {activities.length === 0 ? (
                    <p className="text-xs text-muted">No activity logged yet.</p>
                  ) : (
                    activities.map((a) => (
                      <div key={a.id} className="text-xs border-b border-border/50 pb-2 last:border-0 last:pb-0">
                        <div className="flex justify-between text-muted mb-0.5">
                          <span className="font-medium text-white">{a.actor?.name || "System"}</span>
                          <span>{formatActivityTime(a.createdAt || (a as any).created_at)}</span>
                        </div>
                        <p className="text-slate-300">{a.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </main>

      {activeTask && project && (
        <TaskDetail
          task={activeTask}
          projectId={id!}
          members={project.memberships}
          currentUserRole={userRole}
          onClose={() => setActiveTask(null)}
        />
      )}
    </div>
  );
}
