/**
 * `sort_by` / `sort_dir` fields for list inputs — shared by the list schemas.
 *
 * `sort_by` is the list's sortable columns (Core's key names). Where the BFF
 * forwards to Core, it is applied only when Core supports that key today
 * (lib/core_list.ts `CORE_SORT_KEYS`); the answer's `sortable` says which keys work.
 */

import { z } from 'zod';

/**
 * `sort_by` (enum of `keys`) + `sort_dir`, spread into a list input.
 *
 * @param keys - The sortable columns, in Core's names.
 * @param where - Where the sort is applied, for the field description.
 */
export function sort_fields<const K extends [string, ...string[]]>(keys: K, where = 'applied only where Core supports it (see `sortable` in the answer)') {
    return {
        sort_by: z.enum(keys).optional()
            .describe(`Sort column: ${keys.join(' | ')}; ${where}`),
        sort_dir: z.enum(['asc', 'desc']).optional()
            .describe('Sort direction with sort_by (default per column)'),
    };
}
