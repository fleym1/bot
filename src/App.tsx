import React, { useState, useMemo, useEffect } from 'react';

type TaskPriority = 'Важно' | 'Обычно';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  deadline: string;
}
// вставить апи и колонку задач!!!!!!!
const API_KEY = "";
const TASKS_URL = "https://yougile.com/api-v2/task-list";

const MY_COLUMN_ID = "";

const PRIORITY_STICKER_ID = "de4408e1-ff26-4e43-81bb-d11dd87651db";
const IMPORTANT_STATES = [
  "dcf5fcc816b0",
  "eb85a8d85664",
];

const REFRESH_INTERVAL = 30000;
const DESCRIPTION_MAX_LENGTH = 150;

const stripHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
};

const truncate = (text: string, max: number = DESCRIPTION_MAX_LENGTH): string => {
  if (!text) return '';
  return text.length > max ? text.slice(0, max).trim() + '…' : text;
};

const formatDate = (iso: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU');
};

const daysUntil = (iso: string): number => {
  if (!iso) return 9999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(iso);
  if (isNaN(deadline.getTime())) return 9999;
  deadline.setHours(0, 0, 0, 0);
  return Math.round((deadline.getTime() - today.getTime()) / 86400000);
};

const parseDeadline = (raw: any): string => {
  if (!raw) return '';

  let ms: number | null = null;

  if (typeof raw === 'number') {
    ms = raw;
  } else if (typeof raw === 'object' && typeof raw.deadline === 'number') {
    ms = raw.deadline;
  } else if (typeof raw === 'string') {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) ms = d.getTime();
  }

  if (ms == null) return '';

  const d = new Date(ms);
  if (isNaN(d.getTime())) return '';

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const mapYouGileTask = (raw: any): Task | null => {
  if (MY_COLUMN_ID && raw.columnId !== MY_COLUMN_ID) return null;
  if (raw.completed === true || raw.archived === true) return null;

  const stickers: Record<string, string> = raw.stickers || {};
  const priorityState = stickers[PRIORITY_STICKER_ID];
  const isImportant = IMPORTANT_STATES.includes(priorityState);

  return {
    id: raw.id,
    title: raw.title || 'Без названия',
    description: truncate(stripHtml(raw.description || '')),
    priority: isImportant ? 'Важно' : 'Обычно',
    deadline: parseDeadline(raw.deadline),
  };
};

type TaskCategory =
  | 'overdueImportant'
  | 'overdueNormal'
  | 'urgent'
  | 'important'
  | 'normal';

const getTaskCategory = (task: Task): TaskCategory => {
  const days = daysUntil(task.deadline);
  const isImportant = task.priority === 'Важно';

  if (!task.deadline) return isImportant ? 'important' : 'normal';
  if (days < 0 && isImportant) return 'overdueImportant';
  if (days < 0) return 'overdueNormal';
  if (days <= 1 && days >= 0) return 'urgent';
  if (isImportant) return 'important';
  return 'normal';
};

const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
  const category = getTaskCategory(task);
  const isImportant = task.priority === 'Важно';
  const isOverdue =
    category === 'overdueImportant' || category === 'overdueNormal';
  const isUrgent = category === 'urgent';

  const cardStyle: React.CSSProperties = {
    ...styles.card,
    ...(category === 'important' ? styles.cardImportant : {}),
    ...(category === 'urgent' ? styles.cardUrgent : {}),
    ...(category === 'overdueNormal' ? styles.cardOverdueNormal : {}),
    ...(category === 'overdueImportant' ? styles.cardOverdueImportant : {}),
  };

  return (
    <div style={cardStyle}>
      <div style={styles.cardContent}>
        <h3 style={styles.cardTitle}>{task.title}</h3>

        {task.description && (
          <p style={styles.cardDesc}>{task.description}</p>
        )}

        <div style={styles.meta}>
          <p style={styles.metaText}>
            Приоритет:{' '}
            <span
              style={{
                fontWeight: 600,
                color: isImportant ? '#ef4444' : 'inherit',
              }}
            >
              {task.priority}
            </span>
          </p>

          <p
            style={{
              ...styles.metaText,
              ...(isOverdue ? styles.deadlineOverdue : {}),
            }}
          >
            Дедлайн:{' '}
            <span
              style={{
                fontWeight: 600,
                ...(isUrgent ? styles.deadlineUrgent : {}),
              }}
            >
              {formatDate(task.deadline)}
            </span>
            {isOverdue && ' (просрочено)'}
          </p>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isFirstLoad = true;

    const loadTasks = async () => {
      try {
        const response = await fetch(TASKS_URL, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`YouGile API: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const rawList: any[] = Array.isArray(data.content) ? data.content : [];

        const mapped = rawList
          .map(mapYouGileTask)
          .filter((t): t is Task => t !== null);

        setTasks(mapped);
        setError(null);
      } catch (e: any) {
        console.error(e);
        if (isFirstLoad) {
          setError(e.message || 'Не удалось загрузить задачи');
        }
      } finally {
        isFirstLoad = false;
      }
    };

    loadTasks();

    const intervalId = setInterval(loadTasks, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, []);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const da = daysUntil(a.deadline);
      const db = daysUntil(b.deadline);

      const aOverdue = da < 0;
      const bOverdue = db < 0;

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      return da - db;
    });
  }, [tasks]);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.mainTitle}>Задачи бота</h1>
      </header>

      {error && (
        <div style={styles.errorBox}>
          <p style={{ margin: 0 }}>⚠️ Ошибка: {error}</p>
        </div>
      )}

      <div style={styles.grid}>
        {sortedTasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    padding: '40px 20px',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  header: {
    width: '100%',
    margin: '0 auto 30px auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  mainTitle: { fontSize: '32px', color: '#9ca3af', fontWeight: 600, margin: 0 },
  errorBox: {
    maxWidth: '600px',
    margin: '20px auto',
    padding: '16px 20px',
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    color: '#991b1b',
    fontSize: '14px',
    textAlign: 'center',
  },
  grid: {
    width: '100%',
    margin: '0 auto',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '20px',
  },
  card: {
    position: 'relative',
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxShadow:
      '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '2px solid #e5e7eb',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    width: 'calc((100% - 40px) / 3)',
    boxSizing: 'border-box',
  },
  cardImportant: { borderColor: '#f59e0b' },
  cardUrgent: { borderColor: '#ef4444' },
  cardOverdueNormal: {
    borderColor: '#ef4444',
    borderWidth: '8px',
    boxShadow: '0 0 0 2px #fecaca, 0 4px 8px rgba(239, 68, 68, 0.3)',
  },
  cardOverdueImportant: {
    borderColor: '#ef4444',
    borderWidth: '8px',
    boxShadow: '0 0 0 2px #fecaca, 0 4px 8px rgba(239, 68, 68, 0.3)',
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  cardTitle: {
    fontSize: '20px',
    color: '#111827',
    margin: '0 0 10px 0',
    fontWeight: 500,
  },
  cardDesc: {
    fontSize: '14px',
    color: '#4b5563',
    margin: '0 0 20px 0',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  meta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    marginTop: 'auto',
  },
  metaText: { fontSize: '14px', color: '#374151', margin: 0 },
  deadlineOverdue: { color: '#ef4444', textDecoration: 'line-through' },
  deadlineUrgent: { color: '#ef4444' },
};

export default App;