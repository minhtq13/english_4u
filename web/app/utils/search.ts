// Search text typed into a list, turned into PostgREST filters (see useServerList).

/** The search text, safe inside a PostgREST filter: characters with a meaning there ( , ( ) * % \ ) become spaces. */
export const filterTerm = (s: string) => s.trim().replace(/[,()*%\\]/g, " ").trim()

/** An `.or()` filter that matches a person's name, username or email; `term` comes from filterTerm(). */
export const personSearch = (term: string) => `full_name.ilike.*${term}*,username.ilike.*${term}*,email.ilike.*${term}*`

/** A value safe for one `.ilike()`: its own wildcards ( % _ \ ) are dropped. */
export const likeTerm = (s: string) => s.trim().replace(/[%_\\]/g, "")
