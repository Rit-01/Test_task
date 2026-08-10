# TaskBoard Code Review

This document details the top 4 technical and architectural issues identified in the TaskBoard codebase, prioritized by business impact.

---

### Issue 1: Broken Object Level Authorization (BOLA) / Missing Task Authorization (Highest Priority)
- **File & Line**: [`backend/projects/views.py:165-186`](file:///c:/Users/jatin/Documents/Project/testProject/backend/projects/views.py#L165-L186)
- **Category**: Security
- **Severity**: Critical
- **Description**: The `TaskDetailView.patch` endpoint updates a task by its ID without checking whether the requesting user is a member of the task's parent project or possesses edit privileges (`admin` or `member`). Any authenticated user can modify titles, descriptions, statuses, or assignees of tasks across any project in the system.
- **Recommended Fix**: Fetch the task along with its `project_id`, verify membership via `_get_membership(request.user, project_id)`, and ensure `_can_edit_tasks(membership.role)` returns `True` before allowing modifications; otherwise return HTTP 403 Forbidden.

#### Bug Proof (Curl Output Before Fix)

Step 1: Authenticate as `lina@example.com` (user who has NO membership in "Q3 Launch"):
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"lina@example.com","password":"password123"}'
```
Response:
```json
{
  "user": {"id": "...", "email": "lina@example.com", "name": "Lina Chen"},
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

Step 2: Send PATCH request to update Task `bbdd6cda-47d0-44b5-a521-9f0c1db35662` in "Q3 Launch" as `lina@example.com`:
```bash
curl -X PATCH http://localhost:8000/api/tasks/bbdd6cda-47d0-44b5-a521-9f0c1db35662 \
  -H "Authorization: Bearer <LINA_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hacked Title By Non-Member"}'
```
Response (**HTTP 200 OK — Bug Active**):
```json
{
  "task": {
    "id": "bbdd6cda-47d0-44b5-a521-9f0c1db35662",
    "project_id": "c27aabcc-2874-485a-96ea-39d05f201226",
    "title": "Hacked Title By Non-Member",
    "description": "Detail for: Finalize launch date with marketing",
    "status": "done",
    "assignee_id": "249ddf82-9be7-487a-a0c5-ce5ce586382a",
    "created_by_id": "249ddf82-9be7-487a-a0c5-ce5ce586382a",
    "position": 0
  }
}
```

#### Bug Proof (Curl Output After Fix)

Send the identical PATCH request as `lina@example.com` after applying authorization checks in `TaskDetailView.patch`:
```bash
curl -X PATCH http://localhost:8000/api/tasks/4aa4d8d2-4fd2-4f4b-bc17-52f458004beb \
  -H "Authorization: Bearer <LINA_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hacked Title By Non-Member"}'
```
Response (**HTTP 403 Forbidden — Bug Fixed**):
```json
{
  "error": "forbidden"
}
```

---

### Issue 2: Raw String SQL Injection in Task Search
- **File & Line**: [`backend/projects/views.py:110-120`](file:///c:/Users/jatin/Documents/Project/testProject/backend/projects/views.py#L110-L120)
- **Category**: Security
- **Severity**: High
- **Description**: In `TaskListCreateView.get`, when search parameter `q` is provided, a raw SQL query is constructed using Python f-strings: `f"WHERE project_id = '{project_id}' AND (title ILIKE '%{q}%' OR description ILIKE '%{q}%')"`. Malicious input in `q` allows attackers to bypass filters or extract unauthorized database content.
- **Recommended Fix**: Replace the raw SQL query string interpolation with Django's ORM filtering `Task.objects.filter(project_id=project_id).filter(Q(title__icontains=q) | Q(description__icontains=q))` or pass query parameters safely using parametrized SQL arguments `%s`.

---

### Issue 3: N+1 Database Query Overhead in Project Listing
- **File & Line**: [`backend/projects/views.py:31-41`](file:///c:/Users/jatin/Documents/Project/testProject/backend/projects/views.py#L31-L41)
- **Category**: Performance
- **Severity**: Medium
- **Description**: The `ProjectListCreateView.get` endpoint iterates over user memberships and executes `p.tasks.count()` for each project. This incurs an individual `SELECT COUNT(*)` query per project (1 + N query anti-pattern), causing unnecessary database load as project counts scale.
- **Recommended Fix**: Use Django's `Count` aggregation with `.annotate(task_count=models.Count('project__tasks'))` on the `Membership` queryset to fetch task counts in a single query.

---

### Issue 4: Missing Input Validation & Blank Title Bypass in Task Updates
- **File & Line**: [`backend/projects/views.py:171-173`](file:///c:/Users/jatin/Documents/Project/testProject/backend/projects/views.py#L171-L173)
- **Category**: Data Integrity
- **Severity**: Medium
- **Description**: `TaskDetailView.patch` accepts empty string or whitespace-only titles (`task.title = request.data['title'].strip()`) without checking if the resulting title is empty. This allows tasks to be updated with blank titles, violating the non-empty title contract enforced during creation.
- **Recommended Fix**: Add explicit title validation `if 'title' in request.data: title = request.data['title'].strip(); if not title: return Response({'error': 'title is required'}, status=400)` before saving.
