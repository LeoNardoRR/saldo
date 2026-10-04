import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const ledgers=sqliteTable('saldo_ledgers',{
  userId:text('user_id').primaryKey(),
  revision:integer('revision').notNull(),
  state:text('state').notNull(),
  previousState:text('previous_state'),
  updatedAt:text('updated_at').notNull(),
});
