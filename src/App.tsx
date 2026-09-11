import React, { useState, useMemo, useEffect } from 'react';

type TaskPriority = 'Важно' | 'Обычно';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  deadline: string;
}

const API_KEY = "-oauX4sJNp8MF2zlDp2igO1ib-KyeTY15549407vaYfZ_0Qe0ODt4oJ7RCqDKZRq";
const TASKS_URL = "https://yougile.com/api-v2/task-list";

const MY_COLUMN_ID = "0c5287ca-ae16-4dba-8dcc-e03cb52c970a";

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

// Кол-во колонок и масштаб шрифтов в зависимости от числа задач
const getLayout = (count: number): { cols: number; scale: number } => {
  if (count <= 1) return { cols: 1, scale: 1.6 };
  if (count <= 2) return { cols: 2, scale: 1.4 };
  if (count <= 3) return { cols: 3, scale: 1.2 };
  if (count <= 4) return { cols: 2, scale: 1.2 };
  if (count <= 6) return { cols: 3, scale: 1.0 };
  if (count <= 8) return { cols: 4, scale: 0.9 };
  if (count <= 12) return { cols: 4, scale: 0.8 };
  if (count <= 16) return { cols: 4, scale: 0.7 };
  if (count <= 20) return { cols: 5, scale: 0.6 };
  if (count <= 25) return { cols: 5, scale: 0.55 };
  if (count <= 30) return { cols: 6, scale: 0.5 };
  return { cols: 6, scale: 0.45 };
};

const GAP = 12;

const TaskCard: React.FC<{
  task: Task;
  scale: number;
  cardWidth: string;
  cardHeight: string;
}> = ({ task, scale, cardWidth, cardHeight }) => {
  const category = getTaskCategory(task);
  const isImportant = task.priority === 'Важно';
  const isOverdue =
    category === 'overdueImportant' || category === 'overdueNormal';
  const isUrgent = category === 'urgent';

  const cardStyle: React.CSSProperties = {
    ...styles.card,
    width: cardWidth,
    height: cardHeight,
    padding: `${Math.round(20 * scale)}px ${Math.round(16 * scale)}px`,
    ...(category === 'important' ? styles.cardImportant : {}),
    ...(category === 'urgent' ? styles.cardUrgent : {}),
    ...(category === 'overdueNormal' ? styles.cardOverdueNormal : {}),
    ...(category === 'overdueImportant' ? styles.cardOverdueImportant : {}),
  };

  const titleStyle: React.CSSProperties = {
    ...styles.cardTitle,
    fontSize: `${Math.round(20 * scale)}px`,
    marginBottom: `${Math.round(10 * scale)}px`,
  };

  const descStyle: React.CSSProperties = {
    ...styles.cardDesc,
    fontSize: `${Math.round(14 * scale)}px`,
    marginBottom: `${Math.round(16 * scale)}px`,
  };

  const metaStyle: React.CSSProperties = {
    ...styles.meta,
    gap: `${Math.round(8 * scale)}px`,
  };

  const metaTextStyle: React.CSSProperties = {
    ...styles.metaText,
    fontSize: `${Math.round(14 * scale)}px`,
  };

  return (
    <div style={cardStyle}>
      <div style={styles.cardContent}>
        <h3 style={titleStyle}>{task.title}</h3>

        {task.description && (
          <p style={descStyle}>{task.description}</p>
        )}

        <div style={metaStyle}>
          <p style={metaTextStyle}>
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
              ...metaTextStyle,
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

  const { cols, scale } = getLayout(sortedTasks.length);
  const rows = Math.max(1, Math.ceil(sortedTasks.length / cols));

  const cardWidth = `calc((100% - ${(cols - 1) * GAP}px) / ${cols})`;
  const cardHeight = `calc((100% - ${(rows - 1) * GAP}px) / ${rows})`;

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
          <TaskCard
            key={task.id}
            task={task}
            scale={scale}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
          />
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100vh',
    backgroundColor: '#f3f4f6',
    padding: '16px',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    width: '100%',
    margin: '0 auto 12px auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
  },
  mainTitle: { fontSize: '24px', color: '#9ca3af', fontWeight: 600, margin: 0 },
  errorBox: {
    maxWidth: '600px',
    margin: '8px auto',
    padding: '10px 16px',
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    color: '#991b1b',
    fontSize: '13px',
    textAlign: 'center',
    flexShrink: 0,
  },
  grid: {
    flex: 1,
    width: '100%',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
    gap: `${GAP}px`,
    overflow: 'hidden',
    minHeight: 0,
  },
  card: {
    position: 'relative',
    backgroundColor: '#fff',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    justifyContent: 'center',
    boxShadow:
      '0 2px 4px -1px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
    border: '2px solid #e5e7eb',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  cardImportant: { borderColor: '#f59e0b' },
  cardUrgent: { borderColor: '#ef4444' },
  cardOverdueNormal: {
    borderColor: '#ef4444',
    borderWidth: '6px',
    boxShadow: '0 0 0 2px #fecaca, 0 2px 6px rgba(239, 68, 68, 0.3)',
  },
  cardOverdueImportant: {
    borderColor: '#ef4444',
    borderWidth: '6px',
    boxShadow: '0 0 0 2px #fecaca, 0 2px 6px rgba(239, 68, 68, 0.3)',
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  cardTitle: {
    color: '#111827',
    fontWeight: 500,
    margin: 0,
    wordBreak: 'break-word',
  },
  cardDesc: {
    color: '#4b5563',
    lineHeight: 1.4,
    margin: 0,
    wordBreak: 'break-word',
  },
  meta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  metaText: { color: '#374151', margin: 0 },
  deadlineOverdue: { color: '#ef4444', textDecoration: 'line-through' },
  deadlineUrgent: { color: '#ef4444' },
};

export default App;