// @ts-nocheck
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

function getDb() {
  const { neon } = require('@neondatabase/serverless');
  const { drizzle } = require('drizzle-orm/neon-http');
  const schema = require('./schema');
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const db = getDb();
          const { eq } = require('drizzle-orm');
          const { users } = require('./schema');
          const bcrypt = require('bcryptjs');
          const user = await db.select().from(users).where(eq(users.email, credentials.email)).then((r: any[]) => r[0]);
          if (!user?.passwordHash) return null;
          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!valid) return null;
          return { id: user.id, email: user.email, name: user.name };
        } catch { return null; }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
});
