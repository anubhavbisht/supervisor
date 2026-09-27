import { tool } from "langchain";
import { z } from "zod";
import { searchContacts } from "./directory";

export const getContacts = tool(
    async ({ search }) => {
        const found = searchContacts(search);
        // An explicit "no match" string, not "[]". The model reads an empty
        // array as a successful lookup more often than as a miss.
        return found.length > 0 ? JSON.stringify(found) : `No contacts match "${search}".`;
    },
    {
        name: "get_contacts",
        description:
            "Search contacts by name, team, or email. Pass an empty string to list everyone.",
        schema: z.object({
            search: z.string().describe("search query for the contact, e.g. 'design' or 'sujoy'"),
        }),
    },
);
