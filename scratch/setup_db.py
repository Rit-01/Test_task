import psycopg2

conn = psycopg2.connect(dbname='postgres', user='postgres', password='postgres', host='localhost', port=5432)
conn.autocommit = True
cur = conn.cursor()

cur.execute("SELECT 1 FROM pg_database WHERE datname='taskboard'")
if not cur.fetchone():
    cur.execute("CREATE DATABASE taskboard")
    print("Created database taskboard")
else:
    print("Database taskboard exists")

cur.execute("SELECT 1 FROM pg_roles WHERE rolname='taskboard'")
if not cur.fetchone():
    cur.execute("CREATE USER taskboard WITH PASSWORD 'taskboard'")
    cur.execute("GRANT ALL PRIVILEGES ON DATABASE taskboard TO taskboard")
    cur.execute("ALTER DATABASE taskboard OWNER TO taskboard")
    print("Created user taskboard")
else:
    print("User taskboard exists")

cur.close()
conn.close()
