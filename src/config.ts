const required = (key: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`${key} is not defined in environment variables`);
  }
  return value;
};

export const API_KEY = required('VITE_API_KEY', import.meta.env.VITE_API_KEY);
export const TASKS_URL = required('VITE_TASKS_URL', import.meta.env.VITE_TASKS_URL);
export const MY_COLUMN_ID = required('VITE_MY_COLUMN_ID', import.meta.env.VITE_MY_COLUMN_ID);

export const PRIORITY_STICKER_ID = required('VITE_PRIORITY_STICKER_ID', import.meta.env.VITE_PRIORITY_STICKER_ID);
export const IMPORTANT_STATES = required('VITE_IMPORTANT_STATES', import.meta.env.VITE_IMPORTANT_STATES).split(',');

export const REFRESH_INTERVAL = Number(required('VITE_REFRESH_INTERVAL', import.meta.env.VITE_REFRESH_INTERVAL));
export const DESCRIPTION_MAX_LENGTH = Number(required('VITE_DESCRIPTION_MAX_LENGTH', import.meta.env.VITE_DESCRIPTION_MAX_LENGTH));