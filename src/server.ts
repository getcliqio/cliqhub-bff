import { load_env } from './config/env.js';
import { create_container } from './container.js';
import { create_app } from './app.js';
import { get_logger } from './lib/log.js';

const log = get_logger('server');

async function main() {
    const config = load_env();
    const container = await create_container(config);
    const app = create_app(container);

    // Bind explicitly to '::' so the bff is reachable on Railway's IPv6-only
    // private network. Node's default behavior is system-dependent; binding
    // to '::' is a dual-stack listener that handles both IPv4 and IPv6.
    const server = app.listen(config.port, '::', () => {
        log.info('listening', {
            port: config.port,
            backend_url: config.backend_url,
            env: config.node_env,
        });
    });

    const prune_interval = setInterval(async () => {
        try {
            const count = await container.session_store.prune_expired();
            if (count > 0) log.info('sessions_pruned', { count });
        } catch (err) {
            log.error('session_prune_failed', {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }, 5 * 60_000);
    prune_interval.unref();

    const shutdown = async () => {
        log.info('shutting_down');
        clearInterval(prune_interval);
        server.close();
        await container.session_store.close();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch((err) => {
    log.error('start_failed', {
        error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
});
