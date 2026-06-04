# AI Agent Rules

## DO NOT
- **Modify any config files** — eslint.config.js, tsconfig.json, tsconfig.*.json, vite.config.ts, .prettierrc, .npmrc, lefthook.yml, Makefile, docker-compose.yml, or any `.github/` files
- **Use eslint-disable, ts-expect-error, @ts-ignore, or any suppression comments** in code
- **Use `as any`** to bypass type checking
- **Change lint rules, type settings, or build configuration** to make code pass

## Always do
1. Run `pnpm run lint` — must pass with zero errors
2. Run `pnpm run build` (tsc -b && vite build) — must pass with zero errors
3. Run `pnpm run format` before finishing
4. Respect snake_case naming convention for functions and variables
5. Keep changes minimal — only fix what's asked

## Env variables
- Use `VITE_` prefix for client-side env vars
- Env files: `.env.local` is gitignored, `.env` is committed
- Always validate required env vars at runtime with a clear error message
