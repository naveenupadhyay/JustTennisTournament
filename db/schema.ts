import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const tournamentStore = sqliteTable('tournament_store', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
  updatedAt: text('updated_at').notNull(),
});
