import { DrizzleAdapter } from "@auth/drizzle-adapter";

import {
  db,
  user,
  accounts,
  sessions,
  verificationTokens,
} from "@/lib/db/schema";

export const adapter = DrizzleAdapter(db, {
  usersTable: user,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
});
