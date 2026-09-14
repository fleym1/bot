import "dotenv/config";

const required = (key: string):
string => {
    const value = process.env[key];
    if (!value)
        throw new Error('${key} is not defined in environment variables');
    return value;
};

const API_KEY = "КЛЮЧ_СЮДА";
const TASKS_URL = "https://yougile.com/api-v2/task-list";

const MY_COLUMN_ID = "айди колонки сюда";

const PRIORITY_STICKER_ID = "de4408e1-ff26-4e43-81bb-d11dd87651db";
const IMPORTANT_STATES = [
  "dcf5fcc816b0",
  "eb85a8d85664",
];

const REFRESH_INTERVAL = 30000;
const DESCRIPTION_MAX_LENGTH = 150;