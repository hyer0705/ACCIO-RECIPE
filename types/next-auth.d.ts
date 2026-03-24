import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      isComplete?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    isComplete?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub?: string;
    isComplete?: boolean;
  }
}
