/**
 * Stable UUID for a legacy Hub integer id (migration + test fixtures).
 * Format: 00000000-0000-4000-8000- + 12 hex digits of the int.
 */
export function hub_legacy_uuid(n: number): string {
    if (!Number.isInteger(n) || n < 0 || n > 0xffffffffffff) {
        throw new Error(`hub_legacy_uuid: out of range: ${n}`);
    }
    return `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
}
