import { neon } from '@neondatabase/serverless';

const dbUrl = (process.env.DATABASE_URL || '').replace(/&?channel_binding=require/g, '');
const sql = neon(dbUrl);

export default sql;
