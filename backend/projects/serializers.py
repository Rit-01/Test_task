from rest_framework import serializers
from users.serializers import UserSerializer
from .models import Project, Membership, Task, Comment, ActivityLog


class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    author_id = serializers.SerializerMethodField()
    authorId = serializers.SerializerMethodField()
    task_id = serializers.SerializerMethodField()
    taskId = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()
    createdAt = serializers.SerializerMethodField()

    def get_author_id(self, obj):
        return str(obj.author_id)

    def get_authorId(self, obj):
        return str(obj.author_id)

    def get_task_id(self, obj):
        return str(obj.task_id)

    def get_taskId(self, obj):
        return str(obj.task_id)

    def get_created_at(self, obj):
        return obj.created_at.isoformat()

    def get_createdAt(self, obj):
        return obj.created_at.isoformat()

    class Meta:
        model = Comment
        fields = ['id', 'task_id', 'taskId', 'author_id', 'authorId', 'author', 'body', 'created_at', 'createdAt']


class ActivityLogSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)
    actor_id = serializers.SerializerMethodField()
    actorId = serializers.SerializerMethodField()
    project_id = serializers.SerializerMethodField()
    projectId = serializers.SerializerMethodField()
    actionType = serializers.CharField(source='action_type')
    created_at = serializers.SerializerMethodField()
    createdAt = serializers.SerializerMethodField()

    def get_actor_id(self, obj):
        return str(obj.actor_id)

    def get_actorId(self, obj):
        return str(obj.actor_id)

    def get_project_id(self, obj):
        return str(obj.project_id)

    def get_projectId(self, obj):
        return str(obj.project_id)

    def get_created_at(self, obj):
        return obj.created_at.isoformat()

    def get_createdAt(self, obj):
        return obj.created_at.isoformat()

    class Meta:
        model = ActivityLog
        fields = [
            'id', 'project_id', 'projectId', 'actor_id', 'actorId',
            'actor', 'action_type', 'actionType', 'description', 'created_at', 'createdAt',
        ]


class TaskSerializer(serializers.ModelSerializer):
    assignee = UserSerializer(read_only=True)
    assignee_id = serializers.SerializerMethodField()
    assigneeId = serializers.SerializerMethodField()
    project_id = serializers.SerializerMethodField()
    projectId = serializers.SerializerMethodField()
    created_by_id = serializers.SerializerMethodField()
    createdById = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()
    createdAt = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()
    updatedAt = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)

    def get_assignee_id(self, obj):
        return str(obj.assignee_id) if obj.assignee_id else None

    def get_assigneeId(self, obj):
        return str(obj.assignee_id) if obj.assignee_id else None

    def get_project_id(self, obj):
        return str(obj.project_id)

    def get_projectId(self, obj):
        return str(obj.project_id)

    def get_created_by_id(self, obj):
        return str(obj.created_by_id)

    def get_createdById(self, obj):
        return str(obj.created_by_id)

    def get_created_at(self, obj):
        return obj.created_at.isoformat()

    def get_createdAt(self, obj):
        return obj.created_at.isoformat()

    def get_updated_at(self, obj):
        return obj.updated_at.isoformat()

    def get_updatedAt(self, obj):
        return obj.updated_at.isoformat()

    class Meta:
        model = Task
        fields = [
            'id', 'project_id', 'projectId', 'title', 'description', 'status',
            'assignee_id', 'assigneeId', 'created_by_id', 'createdById', 'position',
            'created_at', 'createdAt', 'updated_at', 'updatedAt',
            'assignee', 'comments',
        ]


class MembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Membership
        fields = ['id', 'role', 'user']


class ProjectDetailSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    owner_id = serializers.SerializerMethodField()
    ownerId = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()
    createdAt = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()
    updatedAt = serializers.SerializerMethodField()
    memberships = MembershipSerializer(many=True, read_only=True)
    tasks = TaskSerializer(many=True, read_only=True)
    activities = ActivityLogSerializer(many=True, read_only=True)

    def get_owner_id(self, obj):
        return str(obj.owner_id)

    def get_ownerId(self, obj):
        return str(obj.owner_id)

    def get_created_at(self, obj):
        return obj.created_at.isoformat()

    def get_createdAt(self, obj):
        return obj.created_at.isoformat()

    def get_updated_at(self, obj):
        return obj.updated_at.isoformat()

    def get_updatedAt(self, obj):
        return obj.updated_at.isoformat()

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'owner_id', 'ownerId', 'owner',
            'memberships', 'tasks', 'activities', 'created_at', 'createdAt', 'updated_at', 'updatedAt',
        ]
