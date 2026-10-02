/**
 * Process entry point: loads config, builds the container and app, listens,
 * prunes expired sessions every 5 minutes and shuts down on SIGINT / SIGTERM.
 */

import { load_env } from './config/env.js';
import { create_container } from './container.js';
import { create_app } from './app.js';
import { get_logger } from './lib/log.js';
import { error_fields } from './lib/best_effort.js';

const log = get_logger('server');

/** Starts the BFF; any failure here is logged as `start_failed` and exits 1. */
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
        // Warn loudly (once) if the running Core is older than this BFF expects.
        void container.core_compat.check();
    });

    const prune_interval = setInterval(async () => {
        try {
            const count = await container.session_store.prune_expired();
            if (count > 0) log.info('sessions_pruned', { count });
        } catch (err) {
            // Housekeeping only (find() rejects expired rows anyway): log and retry next tick.
            log.error('session_prune_failed', error_fields(err));
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
