import { z } from 'zod';
import { procedure, router } from '../trpc';
import { authRouter } from './auth';
export const appRouter = router({
  auth: authRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
