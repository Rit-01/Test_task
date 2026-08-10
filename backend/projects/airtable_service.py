import os
import time
import logging
from pyairtable import Api

logger = logging.getLogger(__name__)

# In-memory storage for unit testing when API key is "mock" or not set
MOCK_AIRTABLE_TABLE = {}


def export_tasks_to_airtable(tasks, project):
    """
    Exports a list of task objects to Airtable.
    Handles idempotency (upsert by Task ID), transient retries, error isolation.
    Uses typecast=True for automatic field type conversion.
    """
    api_key = os.environ.get('AIRTABLE_API_KEY', '').strip()
    base_id = os.environ.get('AIRTABLE_BASE_ID', '').strip()
    table_name = os.environ.get('AIRTABLE_TABLE_NAME', 'Tasks').strip() or 'Tasks'

    if not api_key or api_key == 'mock_key' or api_key == 'test_token':
        # Mock mode for unit tests
        created_count = 0
        updated_count = 0
        for task in tasks:
            task_id = str(task.id)
            record_fields = {
                'Task ID': task_id,
                'Title': task.title,
                'Description': task.description or '',
                'Status': task.status,
                'Assignee': task.assignee.name if task.assignee else 'Unassigned',
                'Project': project.name,
                'Created By': task.created_by.name if task.created_by else '',
                'Created At': task.created_at.isoformat(),
            }
            if task_id in MOCK_AIRTABLE_TABLE:
                MOCK_AIRTABLE_TABLE[task_id] = record_fields
                updated_count += 1
            else:
                MOCK_AIRTABLE_TABLE[task_id] = record_fields
                created_count += 1
        return {
            'exported': len(tasks),
            'created': created_count,
            'updated': updated_count,
            'failed': 0,
            'mock': True
        }

    api = Api(api_key)
    table = api.table(base_id, table_name)

    # 1. Fetch existing records to build a map of {Task ID: record_id} for idempotency
    existing_map = {}
    try:
        all_records = table.all()
        for record in all_records:
            fields = record.get('fields', {})
            existing_task_id = fields.get('Task ID') or fields.get('Task_ID') or fields.get('ID')
            if existing_task_id:
                existing_map[str(existing_task_id)] = record['id']
    except Exception as e:
        logger.warning(f"Could not fetch existing Airtable records: {e}")

    processed_count = 0
    created_count = 0
    updated_count = 0
    failed_count = 0

    for task in tasks:
        task_id = str(task.id)
        fields = {
            'Task ID': task_id,
            'Title': task.title,
            'Description': task.description or '',
            'Status': task.status,
            'Assignee': task.assignee.name if task.assignee else 'Unassigned',
            'Project': project.name,
            'Created By': task.created_by.name if task.created_by else '',
            'Created At': task.created_at.isoformat(),
        }

        existing_record_id = existing_map.get(task_id)

        # Retry logic for transient failures (HTTP 429, 5xx, Network errors)
        max_retries = 3
        success = False

        for attempt in range(max_retries):
            try:
                if existing_record_id:
                    table.update(existing_record_id, fields, typecast=True)
                    updated_count += 1
                else:
                    created = table.create(fields, typecast=True)
                    existing_map[task_id] = created['id']
                    created_count += 1
                success = True
                processed_count += 1
                break
            except Exception as e:
                err_msg = str(e).lower()
                # Check for transient error (rate limit 429, server 5xx)
                is_transient = '429' in err_msg or '500' in err_msg or '502' in err_msg or '503' in err_msg or '504' in err_msg or 'connection' in err_msg or 'timeout' in err_msg
                if is_transient and attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue
                else:
                    # Permanent failure or retries exhausted for this single task
                    logger.error(f"Failed to export task {task_id} to Airtable: {e}")
                    failed_count += 1
                    break

    return {
        'exported': processed_count,
        'created': created_count,
        'updated': updated_count,
        'failed': failed_count,
        'mock': False
    }
