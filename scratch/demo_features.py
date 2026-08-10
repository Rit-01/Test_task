import requests
import json

BASE_URL = "http://localhost:8000"

print("--- 1. AUTHENTICATE ---")
res_meera = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "meera@taskboard.dev", "password": "password123"})
meera_token = res_meera.json()["token"]
headers = {"Authorization": f"Bearer {meera_token}"}
print(f"Meera Login Status: {res_meera.status_code}")

print("\n--- 2. FETCH PROJECT DETAIL ---")
res_projects = requests.get(f"{BASE_URL}/api/projects", headers=headers)
projects = res_projects.json()["projects"]
q3_proj = [p for p in projects if p["name"] == "Q3 Launch"][0]
project_id = q3_proj["id"]
print(f"Project: {q3_proj['name']} ({project_id})")

res_detail = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=headers)
tasks = res_detail.json()["project"]["tasks"]
target_task = tasks[0]
task_id = target_task["id"]
print(f"Target Task: '{target_task['title']}' ({task_id})")

print("\n--- 3. PART 3A - TASK COMMENTS DEMO ---")
comment_payload = {"body": "Engagement audit note: Task schedule confirmed with lead designer."}
res_comment = requests.post(f"{BASE_URL}/api/tasks/{task_id}/comments", json=comment_payload, headers=headers)
print(f"Post Comment Status: {res_comment.status_code}")
print(f"Comment Created:\n{json.dumps(res_comment.json(), indent=2)}")

res_comments = requests.get(f"{BASE_URL}/api/tasks/{task_id}/comments", headers=headers)
print(f"Fetch Comments Status: {res_comments.status_code}")
print(f"Comment Thread:\n{json.dumps(res_comments.json(), indent=2)}")

print("\n--- 4. PART 3B - ACTIVITY FEED DEMO ---")
res_activity = requests.get(f"{BASE_URL}/api/projects/{project_id}/activity", headers=headers)
print(f"Fetch Activity Status: {res_activity.status_code}")
print(f"Recent Activities:\n{json.dumps(res_activity.json(), indent=2)}")

print("\n--- 5. PART 3C - AIRTABLE EXPORT DEMO (RUN 1) ---")
res_export1 = requests.post(f"{BASE_URL}/api/projects/{project_id}/export", headers=headers)
print(f"Export Run 1 Status: {res_export1.status_code}")
print(f"Export Run 1 Response:\n{json.dumps(res_export1.json(), indent=2)}")

print("\n--- 6. PART 3C - AIRTABLE EXPORT DEMO (RUN 2 - IDEMPOTENCY / UNIQUENESS) ---")
res_export2 = requests.post(f"{BASE_URL}/api/projects/{project_id}/export", headers=headers)
print(f"Export Run 2 Status: {res_export2.status_code}")
print(f"Export Run 2 Response:\n{json.dumps(res_export2.json(), indent=2)}")
