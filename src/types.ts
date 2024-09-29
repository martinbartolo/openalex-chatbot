import { z } from "zod";

export type Message = {
  id: string;
  text: string;
  sender: "user" | "bot";
  apiUrl?: string | null;
  currentPage?: number;
  hasMoreResults?: boolean;
  isStreaming?: boolean;
};

const OpenAlexFilter = z.object({
  publicationYear: z.array(z.string()).nullable(),
  citedByCount: z.number().nullable(),
  isOpenAccess: z.boolean().nullable(),
  defaultSearch: z.string().nullable(),
});

export const OpenAlexResponse = z.object({
  api_url: z.string().nullable(),
  filters: OpenAlexFilter,
  invalidSearchExplanation: z.string().nullable(),
});

const OpenAlexRecord = z.object({
  title: z.string(),
  doi: z.string().url().nullable(),
  publication_date: z.string(),
  cited_by_count: z.number(),
  open_access: z.object({
    is_oa: z.boolean(),
  }),
});

export const OpenAlexAPIResponse = z.object({
  meta: z.object({
    count: z.number(),
    page: z.number(),
    per_page: z.number(),
  }),
  results: z.array(OpenAlexRecord),
});

export type ProcessedOpenAlexRecord = {
  title: string;
  link: string | null;
  date: string;
  citations: number;
  isOpenAccess: boolean;
  summary: string;
  loading?: boolean;
};
