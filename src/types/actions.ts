export type ServerAction<T = any> = (...args: any) => Promise<T | { error?: { message: string } }>;
