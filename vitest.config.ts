import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        root: '.',
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: [
                'src/server.ts',
                'src/container.ts',
                'src/config/env.ts',
                'src/types/dto.ts',
                'src/types/vo.ts',
                'src/types.d.ts',
                'src/connect-pg-simple.d.ts',
            ],
        },
    },
});
