import { useState, useRef, useCallback } from "react";
import { openai } from "../utils/openai";
import { DEFAULT_INVALID_SEARCH_EXPLANATION, MODEL } from "../utils/constants";
import { OPENALEX_ROLE } from "../utils/prompts";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { OpenAIError } from "openai/error";
import {
  type Message,
  OpenAlexAPIResponse,
  OpenAlexResponse,
  type ProcessedOpenAlexRecord,
} from "../types";

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [currentResponse, setCurrentResponse] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [initialApiUrl, setInitialApiUrl] = useState<string | null>(null);
  const [hasMoreResults, setHasMoreResults] = useState(true);

  const addMessageToChat = useCallback(
    (message: string, sender: "user" | "bot") => {
      if (message.trim()) {
        setMessages((prev) => [...prev, { text: message, sender }]);
      }
    },
    [],
  );

  const submitMessage = useCallback(
    async (input: string) => {
      if (!input.trim()) return;

      setIsLoading(true);
      addMessageToChat(input, "user");
      setIsStreaming(true);

      try {
        const completion = await openai.beta.chat.completions.parse({
          model: MODEL,
          messages: [
            { role: "system", content: OPENALEX_ROLE },
            { role: "user", content: input },
          ],
          response_format: zodResponseFormat(
            OpenAlexResponse,
            "openalex_response",
          ),
        });

        const parsedResponse = completion.choices[0].message.parsed;

        if (!parsedResponse?.api_url) {
          addMessageToChat(
            parsedResponse?.invalidSearchExplanation ??
              DEFAULT_INVALID_SEARCH_EXPLANATION,
            "bot",
          );
          return;
        }

        setInitialApiUrl(parsedResponse.api_url);
        const response = await fetch(parsedResponse.api_url);
        const apiData = OpenAlexAPIResponse.parse(await response.json());

        const processedData: ProcessedOpenAlexRecord[] = apiData.results.map(
          (record) => ({
            title: record.title,
            link: record.doi,
            date: record.publication_date,
            citations: record.cited_by_count,
            isOpenAccess: record.open_access.is_oa,
          }),
        );

        addMessageToChat(JSON.stringify(processedData), "bot");
      } catch (error: unknown) {
        handleError(error);
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
        setCurrentResponse("");
      }
    },
    [addMessageToChat],
  );

  const handleError = (error: unknown) => {
    if (abortControllerRef.current?.signal.aborted) {
      console.log("Stream aborted by user.");
    } else if (error instanceof OpenAIError) {
      console.error(error);
      setError("API error. Please try again.");
    } else if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      setError("API error. Please try again.");
    } else {
      console.error(error);
      setError("An unexpected error occurred.");
    }
  };

  const abortMessage = useCallback(() => {
    abortControllerRef.current?.abort();
    addMessageToChat(currentResponse, "bot");
  }, [addMessageToChat, currentResponse]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const loadMoreResults = useCallback(async () => {
    if (currentPage === null || initialApiUrl === null) return;

    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    const response = await fetch(`${initialApiUrl}&page=${nextPage}`);
    const apiData = OpenAlexAPIResponse.parse(await response.json());

    // Process the data into the desired format
    const processedData: ProcessedOpenAlexRecord[] = apiData.results.map(
      (record) => ({
        title: record.title,
        link: record.doi,
        date: record.publication_date,
        citations: record.cited_by_count,
        isOpenAccess: record.open_access.is_oa,
      }),
    );

    setMessages((prevMessages) => [
      ...prevMessages.slice(0, -1),
      {
        text: JSON.stringify([
          ...JSON.parse(prevMessages.slice(-1)[0].text),
          ...processedData,
        ]),
        sender: "bot",
      },
    ]);

    // Check if there are more results to load
    setHasMoreResults(
      apiData.meta.page * apiData.meta.per_page < apiData.meta.count,
    );
  }, [initialApiUrl, currentPage]);

  return {
    messages,
    isStreaming,
    isLoading,
    currentResponse,
    submitMessage,
    abortMessage,
    error,
    clearError,
    currentPage,
    loadMoreResults,
    initialApiUrl,
    hasMoreResults,
  };
};
