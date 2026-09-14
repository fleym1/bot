import "dotenv/config";

const required = (key: string):
string => {
    const value = process.env[key];
    if (!value)
        throw new Error('${key} is not defined in environment variables');
    return value;
};

export const API_KEY = required("API_KEY"); 
export const TASKS_URL = required("TASKS_URL"); 

export const MY_COLUMN_ID = required("MY_COLUMN_ID"); 

export const PRIORITY_STICKER_ID = required("PRIORITY_STICKER_ID"); 
export const IMPORTANT_STATES = required("IMPORTANT_STATES");

export const REFRESH_INTERVAL = parseInt(required("REFRESH_INTERVAL")); 
export const DESCRIPTION_MAX_LENGTH = parseInt(required("DESCRIPTION_MAX_LENGTH")); 