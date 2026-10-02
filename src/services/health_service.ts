/** Health — BFF liveness plus the last Core compatibility check (never waits on Core). */

import type { CoreCompatService } from './core_compat_service.js';
import type { HealthData } from '../schemas/health_types.js';

/** Liveness for `/health`. */
export class HealthService {
    constructor(private readonly _core_compat: CoreCompatService) {}

    /** `ok` plus the cached Core compatibility result (null before the first check finishes). */
    get(): HealthData {
        return { status: 'ok', timestamp: new Date().toISOString(), core: this._core_compat.current() };
    }
}
