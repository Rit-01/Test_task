# TaskBoard Terminal Execution Log

This document records the exact step-by-step terminal outputs for repository setup, initial test runs, bug reproduction, fix verification, Part 3a/3b feature execution, Part 3c Airtable export (including uniqueness verification on 2nd run), and final clean test runs.

---

## 1. Setup Output

```powershell
PS C:\Users\jatin\Documents\Project\testProject> git clone https://github.com/ajackus/q-taskboard .
Cloning into '.'...

PS C:\Users\jatin\Documents\Project\testProject> python -m venv venv
PS C:\Users\jatin\Documents\Project\testProject> .\venv\Scripts\pip install -r backend/requirements.txt
Successfully installed annotated-types-0.8.0 asgiref-3.12.1 certifi-2026.7.22 charset_normalizer-3.4.9 colorama-0.4.6 django-5.2.17 django-cors-headers-4.9.0 djangorestframework-3.18.0 djangorestframework-simplejwt-5.5.1 idna-3.18 inflection-0.5.1 iniconfig-2.3.0 packaging-26.3 pluggy-1.6.0 psycopg2-binary-2.9.12 pyairtable-2.3.7 pydantic-2.13.4 pydantic-core-2.46.4 pygments-2.20.0 pyjwt-2.13.0 pytest-8.4.2 pytest-django-4.13.0 requests-2.34.2 sqlparse-0.5.5 typing-extensions-4.16.0 typing-inspection-0.4.2 tzdata-2026.3 urllib3-2.7.0

PS C:\Users\jatin\Documents\Project\testProject\frontend> npm install
added 245 packages, and audited 246 packages in 49s

PS C:\Users\jatin\Documents\Project\testProject> .\venv\Scripts\python backend/manage.py migrate
Operations to perform:
  Apply all migrations: auth, contenttypes, projects, users
Running migrations:
  Applying contenttypes.0001_initial... OK
  Applying auth.0001_initial... OK
  Applying users.0001_initial... OK
  Applying projects.0001_initial... OK

PS C:\Users\jatin\Documents\Project\testProject> .\venv\Scripts\python backend/manage.py seed
seeding...
seed complete.
login with any of these (password: password123):
  meera@taskboard.dev   - admin on Q3 Launch, Internal Tools
  arjun@taskboard.dev   - admin on Onboarding, member on Q3 Launch
  kavya@example.com     - member on Q3 Launch
  dev@example.com       - viewer on Q3 Launch
  lina@example.com      - member on Onboarding
```

---

## 2. Initial Test Run

### Backend Initial Test Run (pytest)
```powershell
PS C:\Users\jatin\Documents\Project\testProject> .\venv\Scripts\python -m pytest backend/projects/tests.py
============================= test session starts =============================
platform win32 -- Python 3.11.6, pytest-8.4.2, pluggy-1.6.0
django: version: 5.2.17, settings: taskboard.settings (from ini)
rootdir: C:\Users\jatin\Documents\Project\testProject\backend
configfile: pytest.ini
plugins: django-4.13.0
collected 7 items

backend\projects\tests.py .......                                        [100%]

============================= 7 passed in 10.95s ==============================
```

### Frontend Initial Test Run (vitest)
```powershell
PS C:\Users\jatin\Documents\Project\testProject\frontend> npm test -- --run
 RUN  v2.1.9 C:/Users/jatin/Documents/Project/testProject/frontend

 ✓ src/tests/schemas.test.ts (6 tests) 6ms
 ✓ src/tests/TaskCard.test.tsx (3 tests) 84ms

 Test Files  2 passed (2)
      Tests  9 passed (9)
```

---

## 3. Bug Curl Proof (Before Fix)

```bash
# 1. Login as lina@example.com (User has NO membership in "Q3 Launch" project)
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"lina@example.com","password":"password123"}'

# Output:
# {"user":{"id":"...","email":"lina@example.com","name":"Lina Chen"},"token":"eyJhbGciOiJIUzI1NiIs..."}

# 2. Send PATCH request to edit task in Q3 Launch
curl -X PATCH http://localhost:8000/api/tasks/bbdd6cda-47d0-44b5-a521-9f0c1db35662 \
  -H "Authorization: Bearer <LINA_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hacked Title By Non-Member"}'

# Output (HTTP 200 OK — BOLA Security Vulnerability Active):
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

---

## 4. Fix Curl Proof (After Fix)

```bash
# Identical PATCH request sent after implementing authorization checks in TaskDetailView.patch
curl -X PATCH http://localhost:8000/api/tasks/4aa4d8d2-4fd2-4f4b-bc17-52f458004beb \
  -H "Authorization: Bearer <LINA_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hacked Title By Non-Member"}'

# Output (HTTP 403 Forbidden — BOLA Security Bug Fixed):
{
  "error": "forbidden"
}
```

---

## 5. Part 3a & 3b Features Demonstration

```powershell
PS C:\Users\jatin\Documents\Project\testProject> .\venv\Scripts\python scratch/demo_features.py

--- 1. AUTHENTICATE ---
Meera Login Status: 200

--- 2. FETCH PROJECT DETAIL ---
Project: Q3 Launch (1b57827f-ccb0-4d94-98e0-f95ebdaa6067)
Target Task: 'Finalize launch date with marketing' (4aa4d8d2-4fd2-4f4b-bc17-52f458004beb)

--- 3. PART 3A - TASK COMMENTS DEMO ---
Post Comment Status: 201
Comment Created:
{
  "comment": {
    "id": "d35a4870-7f2f-4fc1-ad8e-a211cc77a245",
    "task_id": "4aa4d8d2-4fd2-4f4b-bc17-52f458004beb",
    "author_id": "51e0ab43-204b-4ef6-b5eb-1b67faa9c30b",
    "author": {
      "id": "51e0ab43-204b-4ef6-b5eb-1b67faa9c30b",
      "email": "meera@taskboard.dev",
      "name": "Meera Iyer"
    },
    "body": "Engagement audit note: Task schedule confirmed with lead designer.",
    "created_at": "2026-08-10T08:01:37.902597Z"
  }
}

--- 4. PART 3B - ACTIVITY FEED DEMO ---
Fetch Activity Status: 200
Recent Activities:
{
  "activities": [
    {
      "id": "9a19c5c7-2c9e-4b92-b43a-73d8df5a6104",
      "project_id": "1b57827f-ccb0-4d94-98e0-f95ebdaa6067",
      "actor_id": "51e0ab43-204b-4ef6-b5eb-1b67faa9c30b",
      "actor": {
        "id": "51e0ab43-204b-4ef6-b5eb-1b67faa9c30b",
        "email": "meera@taskboard.dev",
        "name": "Meera Iyer"
      },
      "action_type": "comment_added",
      "description": "Comment added to 'Finalize launch date with marketing'",
      "created_at": "2026-08-10T08:01:37.906606Z"
    }
  ]
}
```

---

## 6. Part 3c Airtable Bulk Export Demo (Run 1 & Run 2 Idempotency Proof)

```json
--- 5. PART 3C - AIRTABLE EXPORT DEMO (RUN 1) ---
Export Run 1 Status: 200
Export Run 1 Response:
{
  "exported": 7,
  "created": 7,
  "updated": 0,
  "failed": 0
}

--- 6. PART 3C - AIRTABLE EXPORT DEMO (RUN 2 - IDEMPOTENCY / UNIQUENESS) ---
Export Run 2 Status: 200
Export Run 2 Response:
{
  "exported": 7,
  "created": 0,
  "updated": 7,
  "failed": 0
}
```

---

## 7. Final Clean Test Runs

### Backend Final Test Suite (pytest — 100% Pass)
```powershell
PS C:\Users\jatin\Documents\Project\testProject> .\venv\Scripts\python -m pytest backend/projects/tests.py
============================= test session starts =============================
platform win32 -- Python 3.11.6, pytest-8.4.2, pluggy-1.6.0
django: version: 5.2.17, settings: taskboard.settings (from ini)
rootdir: C:\Users\jatin\Documents\Project\testProject\backend
configfile: pytest.ini
plugins: django-4.13.0
collected 12 items

backend\projects\tests.py ............                                   [100%]

============================= 12 passed in 18.27s =============================
```

### Frontend Final Test Suite (vitest — 100% Pass)
```powershell
PS C:\Users\jatin\Documents\Project\testProject\frontend> npm test -- --run
 RUN  v2.1.9 C:/Users/jatin/Documents/Project/testProject/frontend

 ✓ src/tests/schemas.test.ts (6 tests) 9ms
 ✓ src/tests/TaskCard.test.tsx (3 tests) 121ms
 ✓ src/tests/TaskDetail.test.tsx (2 tests) 136ms

 Test Files  3 passed (3)
      Tests  11 passed (11)
   Start at  13:30:44
   Duration  3.55s
```
