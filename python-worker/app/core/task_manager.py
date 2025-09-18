"""Global task manager for tracking async operations"""

from typing import Dict, Optional, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class TaskManager:
    """Singleton task manager for tracking forecast generation tasks"""

    _instance = None
    _tasks: Dict[str, Dict[str, Any]] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._tasks = {}
        return cls._instance

    def add_task(self, task_id: str, task_data: Dict[str, Any]) -> None:
        """Add a new task to the manager"""
        self._tasks[task_id] = task_data
        logger.info(f"Task {task_id} added to manager. Total tasks: {len(self._tasks)}")

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task by ID"""
        task = self._tasks.get(task_id)
        if task:
            logger.info(f"Task {task_id} found: status={task.get('status')}")
        else:
            logger.warning(f"Task {task_id} not found in {len(self._tasks)} tasks")
        return task

    def update_task(self, task_id: str, updates: Dict[str, Any]) -> bool:
        """Update task data"""
        if task_id in self._tasks:
            self._tasks[task_id].update(updates)
            logger.info(f"Task {task_id} updated: {updates}")
            return True
        logger.warning(f"Cannot update task {task_id} - not found")
        return False

    def remove_task(self, task_id: str) -> bool:
        """Remove completed or expired task"""
        if task_id in self._tasks:
            del self._tasks[task_id]
            logger.info(f"Task {task_id} removed. Remaining tasks: {len(self._tasks)}")
            return True
        return False

    def cleanup_old_tasks(self, max_age_seconds: int = 3600) -> int:
        """Remove tasks older than specified age"""
        now = datetime.utcnow()
        removed = 0

        tasks_to_remove = []
        for task_id, task_data in self._tasks.items():
            created_at = task_data.get('created_at')
            if created_at:
                age = (now - created_at).total_seconds()
                if age > max_age_seconds:
                    tasks_to_remove.append(task_id)

        for task_id in tasks_to_remove:
            self.remove_task(task_id)
            removed += 1

        if removed > 0:
            logger.info(f"Cleaned up {removed} old tasks")

        return removed

    def get_all_tasks(self) -> Dict[str, Dict[str, Any]]:
        """Get all tasks (for debugging)"""
        return self._tasks.copy()

    def task_count(self) -> int:
        """Get current task count"""
        return len(self._tasks)


# Global instance
task_manager = TaskManager()