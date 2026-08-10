import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { ApiTask, ApiProjectMember, ApiComment, TaskStatus } from "@/types";
import { STATUS_LABELS, STATUS_ORDER } from "@/types";

type Props = {
  task: ApiTask;
  projectId: string;
  members: ApiProjectMember[];
  onClose: () => void;
  currentUserRole?: string;
};

function formatCommentTime(rawDate?: string) {
  if (!rawDate) return "Just now";
  const parsed = new Date(rawDate);
  if (isNaN(parsed.getTime())) return "Just now";
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function TaskDetail({ task, projectId, members, onClose, currentUserRole }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [assigneeId, setAssigneeId] = useState<string>(task.assigneeId ?? "");
  const [commentBody, setCommentBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);

  const { data: commentData } = useQuery({
    queryKey: ["comments", task.id],
    queryFn: () => apiFetch<{ comments: ApiComment[] }>(`/api/tasks/${task.id}/comments`),
    initialData: task.comments ? { comments: task.comments } : undefined,
  });

  const updateTask = useMutation({
    mutationFn: (input: Partial<ApiTask>) =>
      apiFetch<{ task: ApiTask }>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "save failed"),
  });

  const deleteTask = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: true }>(`/api/tasks/${task.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "delete failed"),
  });

  const postComment = useMutation({
    mutationFn: (body: string) =>
      apiFetch<{ comment: ApiComment }>(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      setCommentBody("");
      setCommentError(null);
      queryClient.invalidateQueries({ queryKey: ["comments", task.id] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (err) => setCommentError(err instanceof Error ? err.message : "failed to post comment"),
  });

  function onSave() {
    setError(null);
    updateTask.mutate({
      title,
      description,
      status,
      assigneeId: assigneeId || null,
    });
  }

  const isViewer = currentUserRole === "viewer";
  const comments = commentData?.comments || [];

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50 overflow-y-auto py-10"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-lg p-6 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">edit task</h2>
          <button onClick={onClose} className="text-muted hover:text-white">
            ✕
          </button>
        </div>

        <label className="block mb-3">
          <span className="text-xs text-muted">title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isViewer}
            className="mt-1 block w-full rounded-md bg-bg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none disabled:opacity-60"
          />
        </label>

        <label className="block mb-3">
          <span className="text-xs text-muted">description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isViewer}
            rows={3}
            className="mt-1 block w-full rounded-md bg-bg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none disabled:opacity-60"
          />
        </label>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="block">
            <span className="text-xs text-muted">status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              disabled={isViewer}
              className="mt-1 block w-full rounded-md bg-bg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none disabled:opacity-60"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-muted">assignee</span>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              disabled={isViewer}
              className="mt-1 block w-full rounded-md bg-bg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none disabled:opacity-60"
            >
              <option value="">unassigned</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-400 mb-3" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 pb-6 border-b border-border mb-6">
          {!isViewer ? (
            <button
              onClick={() => deleteTask.mutate()}
              disabled={deleteTask.isPending}
              className="text-sm text-red-400 hover:text-red-300"
            >
              delete task
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-md border border-border hover:border-muted"
            >
              cancel
            </button>
            {!isViewer && (
              <button
                onClick={onSave}
                disabled={updateTask.isPending}
                className="text-sm px-4 py-2 rounded-md bg-accent text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {updateTask.isPending ? "saving…" : "save"}
              </button>
            )}
          </div>
        </div>

        {/* Task Comments Section (Part 3a) */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold">Comments ({comments.length})</h3>

          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="text-xs text-muted">No comments yet.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="bg-bg border border-border rounded-md p-3 text-xs">
                  <div className="flex justify-between items-center text-muted mb-1">
                    <span className="font-medium text-white">{c.author?.name || "Member"}</span>
                    <span>{formatCommentTime(c.createdAt || (c as any).created_at)}</span>
                  </div>
                  <p className="text-slate-300 whitespace-pre-wrap">{c.body}</p>
                </div>
              ))
            )}
          </div>

          {!isViewer ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!commentBody.trim()) return;
                postComment.mutate(commentBody.trim());
              }}
              className="mt-3 flex gap-2"
            >
              <input
                type="text"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 rounded-md bg-bg border border-border px-3 py-2 text-xs focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={postComment.isPending || !commentBody.trim()}
                className="bg-accent text-white text-xs font-medium rounded-md px-3 py-2 hover:bg-indigo-500 disabled:opacity-50"
              >
                Post
              </button>
            </form>
          ) : (
            <p className="text-xs text-muted italic">Viewers cannot post comments.</p>
          )}

          {commentError && (
            <p className="text-xs text-red-400 mt-1" role="alert">
              {commentError}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
