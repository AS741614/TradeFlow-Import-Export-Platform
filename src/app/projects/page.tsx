'use client';

import { useState, useCallback, useEffect, type DragEvent, type SubmitEvent } from 'react';
import { getItems, addItem, updateItem } from '@/lib/storage';
import { generateId, nowISO, formatDate } from '@/lib/utils';
import { getDefaultTasks } from '@/lib/constants';
import type { Task, TaskStatus, TaskPriority } from '@/lib/types';
import { StorageError } from '@/lib/api-client';
import Loading from '@/components/Loading';
import ErrorBanner from '@/components/ErrorBanner';

// ---- Column configuration ----

interface KanbanColumnConfig {
  id: TaskStatus;
  title: string;
  icon: React.ReactNode;
}

const COLUMNS: KanbanColumnConfig[] = [
  {
    id: 'todo',
    title: 'To Do',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
  {
    id: 'review',
    title: 'Review',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    id: 'done',
    title: 'Done',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
];

// ---- Priority color helper ----

function getPriorityBadgeClass(priority: TaskPriority): string {
  switch (priority) {
    case 'urgent': return 'status-danger';
    case 'high': return 'status-warning';
    case 'medium': return 'status-info';
    case 'low': return 'status-neutral';
  }
}

// ---- New task form state ----

interface NewTaskForm {
  title: string;
  description: string;
  priority: TaskPriority;
  category: string;
  dueDate: string;
  assignee: string;
  tags: string;
}

const EMPTY_FORM: NewTaskForm = {
  title: '',
  description: '',
  priority: 'medium',
  category: '',
  dueDate: '',
  assignee: '',
  tags: '',
};

// ============================================================
// Projects Dashboard Page
// ============================================================

export default function ProjectsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewTaskForm>(EMPTY_FORM);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let stored = await getItems<Task>('tasks');
        if (stored.length === 0) {
          const defaults = getDefaultTasks();
          for (const item of defaults) {
            await addItem<Task>('tasks', item);
          }
          stored = await getItems<Task>('tasks');
        }
        if (!cancelled) {
          setTasks(stored);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof StorageError ? err.message : 'Failed to load tasks');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Derived metrics ----

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length;
  const urgentTasks = tasks.filter((t) => t.priority === 'urgent').length;

  // ---- Group tasks by column ----

  const tasksByStatus = useCallback(
    (status: TaskStatus): Task[] => tasks.filter((t) => t.status === status),
    [tasks],
  );

  // ---- Drag-and-drop handlers ----

  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(taskId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverColumn(null);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, columnStatus: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnStatus);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('text/plain');
      if (!taskId) return;

      try {
        const fresh = await updateItem<Task>('tasks', taskId, { status: targetStatus, updatedAt: nowISO() });
        setTasks(fresh);
      } catch (err) {
        setError(err instanceof StorageError ? err.message : 'Failed to update task status');
      }

      setDraggingId(null);
      setDragOverColumn(null);
    },
    [],
  );

  // ---- Add task handler ----

  const handleAddTask = useCallback(
    async (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!form.title.trim()) return;

      const now = nowISO();
      const newTask: Task = {
        id: generateId(),
        title: form.title.trim(),
        description: form.description.trim(),
        status: 'todo',
        priority: form.priority,
        category: form.category.trim() || 'General',
        dueDate: form.dueDate || undefined,
        assignee: form.assignee.trim() || undefined,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        createdAt: now,
        updatedAt: now,
      };

      try {
        const updated = await addItem<Task>('tasks', newTask);
        setTasks(updated);
        setForm(EMPTY_FORM);
        setShowModal(false);
      } catch (err) {
        setError(err instanceof StorageError ? err.message : 'Failed to add task');
      }
    },
    [form],
  );

  // ---- Render ----

  return (
    <div className="animate-fade-in">
      {/* ---- Page Header ---- */}
      <div className="page-header">
        <div className="page-header-top">
          <h1>Projects</h1>
          <button
            id="add-task-btn"
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Task
          </button>
        </div>
        <p>Manage your import/export business tasks with a Kanban workflow.</p>
      </div>

      {/* ---- Header Metrics ---- */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* Total Tasks */}
        <div className="metric-card blue stagger-item" id="metric-total-tasks">
          <div className="metric-card-icon blue">
            <svg viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          </div>
          <div className="metric-card-content">
            <div className="metric-card-label">Total Tasks</div>
            <div className="metric-card-value">{totalTasks}</div>
          </div>
        </div>

        {/* Completed */}
        <div className="metric-card emerald stagger-item" id="metric-completed-tasks">
          <div className="metric-card-icon emerald">
            <svg viewBox="0 0 24 24">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="metric-card-content">
            <div className="metric-card-label">Completed</div>
            <div className="metric-card-value">{completedTasks}</div>
          </div>
        </div>

        {/* In Progress */}
        <div className="metric-card amber stagger-item" id="metric-in-progress-tasks">
          <div className="metric-card-icon amber">
            <svg viewBox="0 0 24 24">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div className="metric-card-content">
            <div className="metric-card-label">In Progress</div>
            <div className="metric-card-value">{inProgressTasks}</div>
          </div>
        </div>

        {/* Urgent */}
        <div className="metric-card red stagger-item" id="metric-urgent-tasks">
          <div className="metric-card-icon red">
            <svg viewBox="0 0 24 24">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="metric-card-content">
            <div className="metric-card-label">Urgent</div>
            <div className="metric-card-value">{urgentTasks}</div>
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <Loading />
      ) : (
        <div className="kanban-board">
          {COLUMNS.map((col) => {
            const columnTasks = tasksByStatus(col.id);
            return (
              <div
                key={col.id}
                id={`kanban-column-${col.id}`}
                className="kanban-column"
                style={{
                  borderColor: dragOverColumn === col.id ? 'var(--accent-blue)' : undefined,
                  background: dragOverColumn === col.id ? 'var(--accent-blue-bg)' : undefined,
                  transition: 'border-color 200ms ease, background 200ms ease',
                }}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => { void handleDrop(e, col.id); }}
              >
                {/* Column header */}
                <div className="kanban-column-header">
                  <div className="kanban-column-title">
                    {col.icon}
                    {col.title}
                  </div>
                  <span className="kanban-column-count">{columnTasks.length}</span>
                </div>

                {/* Task cards */}
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    id={`kanban-card-${task.id}`}
                    className={`kanban-card stagger-item${draggingId === task.id ? ' dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="kanban-card-title">{task.title}</div>
                    <div className="kanban-card-meta">
                      <span className={`tag tag-blue`} style={{ fontSize: 'var(--font-size-xs)' }}>
                        {task.category}
                      </span>
                      <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    {task.dueDate && (
                      <div
                        style={{
                          marginTop: 'var(--space-sm)',
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--text-tertiary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-xs)',
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        {formatDate(task.dueDate)}
                      </div>
                    )}
                  </div>
                ))}

                {/* Empty column state */}
                {columnTasks.length === 0 && (
                  <div
                    style={{
                      padding: 'var(--space-xl)',
                      textAlign: 'center',
                      color: 'var(--text-tertiary)',
                      fontSize: 'var(--font-size-xs)',
                    }}
                  >
                    Drop tasks here
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Add Task Modal ---- */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Task</h2>
              <button
                id="close-task-modal-btn"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setShowModal(false)}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => { void handleAddTask(e); }}>
              <div className="modal-body">
                {/* Title */}
                <div className="form-group">
                  <label className="form-label" htmlFor="task-title">
                    Title *
                  </label>
                  <input
                    id="task-title"
                    className="form-input"
                    type="text"
                    placeholder="Enter task title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    required
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label" htmlFor="task-description">
                    Description
                  </label>
                  <textarea
                    id="task-description"
                    className="form-textarea"
                    placeholder="Add details about this task"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                {/* Priority & Category row */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="task-priority">
                      Priority
                    </label>
                    <select
                      id="task-priority"
                      className="form-select"
                      value={form.priority}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="task-category">
                      Category
                    </label>
                    <input
                      id="task-category"
                      className="form-input"
                      type="text"
                      placeholder="e.g. Operations, Marketing"
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Due Date & Assignee row */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="task-due-date">
                      Due Date
                    </label>
                    <input
                      id="task-due-date"
                      className="form-input"
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="task-assignee">
                      Assignee
                    </label>
                    <input
                      id="task-assignee"
                      className="form-input"
                      type="text"
                      placeholder="Who is responsible?"
                      value={form.assignee}
                      onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Tags */}
                <div className="form-group">
                  <label className="form-label" htmlFor="task-tags">
                    Tags (comma-separated)
                  </label>
                  <input
                    id="task-tags"
                    className="form-input"
                    type="text"
                    placeholder="e.g. logistics, urgent, Q3"
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  id="cancel-task-btn"
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button id="submit-task-btn" type="submit" className="btn btn-primary">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
