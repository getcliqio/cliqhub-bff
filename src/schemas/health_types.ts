/**
 * Health — response data of `GET /bff-health` (controllers/health_controller.ts).
 */

/** Result of the last Core `/v1/health` check (services/core_compat_service.ts). */
export interface CoreCompatData {
    /** Unix ms. */
    checked_at: number;
    reachable: boolean;
    version: string | null;
    api_version: number | null;
    /** Unix ms. */
    started_at: number | null;
    required_api_version: number;
    compatible: boolean;
    /** Human-readable reason when not compatible. */
    message: string | null;
}

/** `GET /bff-health` */
export interface HealthData {
    status: 'ok';
    timestamp: string;
    /** Last Core compatibility check (null until the first one finishes). */
    core: CoreCompatData | null;
}
