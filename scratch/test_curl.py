import requests

# 1. Login as meera (admin on Q3 Launch)
res_meera = requests.post("http://localhost:8000/api/auth/login", json={"email": "meera@taskboard.dev", "password": "password123"})
meera_token = res_meera.json()["token"]

# Get projects
res_proj = requests.get("http://localhost:8000/api/projects", headers={"Authorization": f"Bearer {meera_token}"})
projects = res_proj.json()["projects"]
q3_proj = [p for p in projects if p["name"] == "Q3 Launch"][0]
q3_id = q3_proj["id"]

# Get project detail to get task id
res_detail = requests.get(f"http://localhost:8000/api/projects/{q3_id}", headers={"Authorization": f"Bearer {meera_token}"})
tasks = res_detail.json()["project"]["tasks"]
target_task = tasks[0]
task_id = target_task["id"]

print(f"Q3 Launch Project ID: {q3_id}")
print(f"Target Task ID: {task_id}, Title: {target_task['title']}")

# 2. Login as lina (non-member of Q3 Launch)
res_lina = requests.post("http://localhost:8000/api/auth/login", json={"email": "lina@example.com", "password": "password123"})
lina_token = res_lina.json()["token"]
print(f"Lina Token: {lina_token[:20]}...")

# Try patching task as lina (non-member) BEFORE fix
res_patch = requests.patch(f"http://localhost:8000/api/tasks/{task_id}", headers={"Authorization": f"Bearer {lina_token}"}, json={"title": "Hacked Title By Non-Member"})
print(f"Patch Response Status: {res_patch.status_code}")
print(f"Patch Response Body: {res_patch.text}")
