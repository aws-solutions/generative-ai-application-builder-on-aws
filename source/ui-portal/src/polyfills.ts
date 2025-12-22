// Vite/browser builds don't define Node globals by default.
// Some dependencies still reference `global`.
(globalThis as any).global = globalThis;


