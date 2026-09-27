/**
 * Stand-in for a contacts database. The record shape is what a real directory
 * would return, so swapping in a live query changes only `searchContacts`.
 */
export type Contact = {
    id: number;
    team: string;
    name: string;
    email: string;
};

export const CONTACTS: Contact[] = [
    { id: 1, team: "design", name: "Sujoy", email: "sujoy@codersgyan.com" },
    { id: 2, team: "design", name: "John", email: "john@codersgyan.com" },
    { id: 3, team: "development", name: "Kevin", email: "kevin@codersgyan.com" },
];

/**
 * Case-insensitive match on name, team, or email.
 *
 * The stub has to actually filter. If it returned the whole directory for
 * every query, "email Sujoy" would appear to work while the model did the
 * filtering itself from the full list. That hides a failure mode you would
 * only meet with a real directory too big to send back.
 */
export function searchContacts(query: string, contacts: Contact[] = CONTACTS): Contact[] {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;

    return contacts.filter((c) =>
        [c.name, c.team, c.email].some((field) => field.toLowerCase().includes(q)),
    );
}
