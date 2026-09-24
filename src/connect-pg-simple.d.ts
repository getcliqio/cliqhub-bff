/** Ambient type declaration for connect-pg-simple (no published @types). */
declare module 'connect-pg-simple' {
    import session from 'express-session';

    function connect_pg(s: typeof session): new (options: {
        conString?: string;
        schemaName?: string;
        tableName?: string;
        createTableIfMissing?: boolean;
    }) => session.Store;

    export = connect_pg;
}
