/**
 * A realm addressed the way realm URLs do (`/o/:org_slug/realms/:slug`) —
 * shared by the realm page schemas.
 */

import { z } from 'zod';

/** A URL slug segment. */
const SlugField = z.string().trim().min(1).max(128);

/** `org_slug` + `slug` fields, spread into realm page inputs. */
export const RealmRefFields = {
    org_slug: SlugField.describe('Owning org slug (from the /o/:org URL)'),
    slug: SlugField.describe('Realm slug (from the /realms/:slug URL)'),
};

/** The realm reference as an object (nested in other inputs). */
export const RealmRefInput = z.object(RealmRefFields).strict();
export type RealmRefInput = z.infer<typeof RealmRefInput>;
