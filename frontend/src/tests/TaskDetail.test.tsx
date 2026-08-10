import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TaskDetail } from "@/components/TaskDetail";
import type { ApiTask, ApiProjectMember } from "@/types";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockTask: ApiTask = {
  id: "t1",
  projectId: "p1",
  title: "Test Task",
  description: "Test Description",
  status: "todo",
  assigneeId: null,
  createdById: "u1",
  position: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  comments: [
    {
      id: "c1",
      taskId: "t1",
      authorId: "u1",
      author: { id: "u1", name: "Meera", email: "meera@dev.com" },
      body: "Initial comment",
      createdAt: new Date().toISOString(),
    },
  ],
};

const mockMembers: ApiProjectMember[] = [
  { id: "m1", role: "admin", user: { id: "u1", name: "Meera", email: "meera@dev.com" } },
];

describe("<TaskDetail />", () => {
  it("renders comments and allows posting for non-viewers", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TaskDetail
          task={mockTask}
          projectId="p1"
          members={mockMembers}
          currentUserRole="admin"
          onClose={vi.fn()}
        />
      </QueryClientProvider>
    );

    expect(screen.getByText("Initial comment")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Add a comment…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post" })).toBeInTheDocument();
  });

  it("restricts viewer from editing and posting comments", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TaskDetail
          task={mockTask}
          projectId="p1"
          members={mockMembers}
          currentUserRole="viewer"
          onClose={vi.fn()}
        />
      </QueryClientProvider>
    );

    expect(screen.getByText("Viewers cannot post comments.")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Add a comment…")).not.toBeInTheDocument();
  });
});
