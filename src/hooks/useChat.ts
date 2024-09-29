import { useState, useRef, useCallback } from "react";
import { openai } from "../utils/openai";
import { DEFAULT_INVALID_SEARCH_EXPLANATION, MODEL } from "../utils/constants";
import { OPENALEX_ROLE, SUMMARY_ROLE } from "../utils/prompts";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { OpenAIError } from "openai/error";
import {
  Message,
  OpenAlexAPIResponse,
  OpenAlexResponse,
  ProcessedOpenAlexRecord,
} from "../types";
import { ChatCompletionChunk } from "openai/resources/chat";
import { v4 as uuidv4 } from "uuid";

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const abortControllersRef = useRef<Set<AbortController>>(new Set());

  const addMessageToChat = useCallback(
    (
      message: string,
      sender: "user" | "bot",
      metadata: Partial<Message> = {},
    ) => {
      if (message.trim()) {
        const newMessage: Message = {
          id: uuidv4(),
          text: message,
          sender,
          ...metadata,
        };
        setMessages((prev) => [...prev, newMessage]);
      }
    },
    [],
  );

  const handleError = useCallback((error: unknown) => {
    if (error instanceof OpenAIError) {
      console.error(error);
      setError("API error. Please try again.");
    } else if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      setError("API error. Please try again.");
    } else if (error instanceof Error) {
      console.error("Error:", error);
      setError(error.message);
    } else {
      console.error(error);
      setError("An unexpected error occurred.");
    }
  }, []);

  const generateSummaries = useCallback(
    async (titles: string[], signal: AbortSignal) => {
      const stream = await openai.chat.completions.create(
        {
          model: MODEL,
          messages: [
            {
              role: "system",
              content: SUMMARY_ROLE,
            },
            {
              role: "user",
              content: titles.join("\n"),
            },
          ],
          stream: true,
        },
        { signal },
      );

      return stream;
    },
    [],
  );

  const processSummaries = useCallback(
    async (
      stream: AsyncIterable<ChatCompletionChunk>,
      apiData: z.infer<typeof OpenAlexAPIResponse>,
      updateFunction: (
        processedData: ProcessedOpenAlexRecord,
        index: number,
        messageId: string,
      ) => void,
      messageId: string,
      abortSignal: AbortSignal,
    ) => {
      let currentSummary = "";
      let processedCount = 0;

      for await (const chunk of stream) {
        if (abortSignal.aborted) {
          break;
        }

        const content = chunk.choices[0]?.delta?.content || "";
        currentSummary += content;

        if (content.includes("---")) {
          const [summary, ...rest] = currentSummary.split("---");
          currentSummary = rest.join("---");

          const paperData = apiData.results[processedCount];
          if (paperData) {
            const processedRecord: ProcessedOpenAlexRecord = {
              title: paperData.title,
              link: paperData.doi,
              date: paperData.publication_date,
              citations: paperData.cited_by_count,
              isOpenAccess: paperData.open_access.is_oa,
              summary: summary.trim(),
            };

            if (!abortSignal.aborted) {
              updateFunction(processedRecord, processedCount, messageId);
            }
            processedCount++;
          }
        }
      }

      if (
        !abortSignal.aborted &&
        currentSummary.trim() &&
        processedCount < apiData.results.length
      ) {
        const paperData = apiData.results[processedCount];
        if (paperData) {
          const processedRecord: ProcessedOpenAlexRecord = {
            title: paperData.title,
            link: paperData.doi,
            date: paperData.publication_date,
            citations: paperData.cited_by_count,
            isOpenAccess: paperData.open_access.is_oa,
            summary: currentSummary.trim(),
          };

          updateFunction(processedRecord, processedCount, messageId);
        }
      }
    },
    [],
  );

  const submitMessage = useCallback(
    async (input: string) => {
      if (!input.trim()) return;

      setIsLoading(true);
      addMessageToChat(input, "user");

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

        const newBotMessageId = uuidv4();
        const abortController = new AbortController();

        // Add the new AbortController to the Set
        abortControllersRef.current.add(abortController);

        addMessageToChat(JSON.stringify([]), "bot", {
          apiUrl: parsedResponse.api_url,
          currentPage: 1,
          hasMoreResults: true,
          isStreaming: true,
          id: newBotMessageId,
        });

        const response = await fetch(parsedResponse.api_url, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorMessage = await response.text();
          throw new Error(
            `OpenAlex API error: ${response.status} ${response.statusText}\n${errorMessage}`,
          );
        }
        const apiData = OpenAlexAPIResponse.parse(await response.json());

        const titles = apiData.results.map((record) => record.title);

        // Initialize bot message with loading placeholders
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === newBotMessageId
              ? {
                  ...msg,
                  text: JSON.stringify(
                    apiData.results.map((record) => ({
                      title: record.title,
                      link: record.doi,
                      date: record.publication_date,
                      citations: record.cited_by_count,
                      isOpenAccess: record.open_access.is_oa,
                      summary: "",
                      loading: true,
                    })),
                  ),
                }
              : msg,
          ),
        );

        const stream = await generateSummaries(titles, abortController.signal);

        setIsLoading(false);

        await processSummaries(
          stream,
          apiData,
          (processedData, index, messageId) => {
            setMessages((prevMessages) =>
              prevMessages.map((msg) => {
                if (msg.id === messageId && msg.sender === "bot") {
                  const currentData: ProcessedOpenAlexRecord[] = JSON.parse(
                    msg.text,
                  );
                  currentData[index] = {
                    ...currentData[index],
                    summary: processedData.summary,
                    link: processedData.link,
                    date: processedData.date,
                    citations: processedData.citations,
                    isOpenAccess: processedData.isOpenAccess,
                    loading: false,
                  };
                  const allLoaded = currentData.every((item) => !item.loading);
                  return {
                    ...msg,
                    text: JSON.stringify(currentData),
                    isStreaming: !allLoaded,
                  };
                }
                return msg;
              }),
            );
          },
          newBotMessageId,
          abortController.signal,
        );

        // Remove the controller after processing
        abortControllersRef.current.delete(abortController);
      } catch (error: unknown) {
        handleError(error);
      } finally {
        setIsLoading(false);
      }
    },
    [addMessageToChat, handleError, generateSummaries, processSummaries],
  );

  const loadMoreResults = useCallback(
    async (messageId: string) => {
      const targetMessage = messages.find(
        (msg) => msg.id === messageId && msg.sender === "bot",
      );

      if (
        !targetMessage ||
        !targetMessage.apiUrl ||
        !targetMessage.hasMoreResults
      )
        return;

      const nextPage = (targetMessage.currentPage || 1) + 1;
      const abortController = new AbortController();

      // Add the new AbortController to the Set
      abortControllersRef.current.add(abortController);

      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId
            ? { ...msg, currentPage: nextPage, isStreaming: true }
            : msg,
        ),
      );

      try {
        const response = await fetch(
          `${targetMessage.apiUrl}&page=${nextPage}`,
          { signal: abortController.signal },
        );
        if (!response.ok) {
          const errorMessage = await response.text();
          throw new Error(
            `OpenAlex API error: ${response.status} ${response.statusText}\n${errorMessage}`,
          );
        }
        const apiData = OpenAlexAPIResponse.parse(await response.json());

        const titles = apiData.results.map((record) => record.title);

        // Append new loading placeholders to the existing bot message
        setMessages((prevMessages) =>
          prevMessages.map((msg) => {
            if (msg.id === messageId && msg.sender === "bot") {
              const existingData: ProcessedOpenAlexRecord[] = JSON.parse(
                msg.text,
              );
              const newPlaceholders = apiData.results.map((record) => ({
                title: record.title,
                link: record.doi,
                date: record.publication_date,
                citations: record.cited_by_count,
                isOpenAccess: record.open_access.is_oa,
                summary: "",
                loading: true,
              }));
              return {
                ...msg,
                text: JSON.stringify([...existingData, ...newPlaceholders]),
                hasMoreResults:
                  apiData.meta.count > nextPage * apiData.meta.per_page,
              };
            }
            return msg;
          }),
        );

        const stream = await generateSummaries(titles, abortController.signal);

        await processSummaries(
          stream,
          apiData,
          (processedData, index, msgId) => {
            setMessages((prevMessages) =>
              prevMessages.map((msg) => {
                if (msg.id === msgId && msg.sender === "bot") {
                  const currentData: ProcessedOpenAlexRecord[] = JSON.parse(
                    msg.text,
                  );
                  const targetIndex =
                    currentData.length - titles.length + index; // Calculate the correct index
                  currentData[targetIndex] = {
                    ...currentData[targetIndex],
                    summary: processedData.summary,
                    link: processedData.link,
                    date: processedData.date,
                    citations: processedData.citations,
                    isOpenAccess: processedData.isOpenAccess,
                    loading: false,
                  };
                  const allLoaded = currentData
                    .slice(currentData.length - titles.length)
                    .every((item) => !item.loading);
                  return {
                    ...msg,
                    text: JSON.stringify(currentData),
                    isStreaming: !allLoaded && msg.hasMoreResults,
                  };
                }
                return msg;
              }),
            );
          },
          messageId,
          abortController.signal,
        );

        // Remove the controller after processing
        abortControllersRef.current.delete(abortController);
      } catch (error: unknown) {
        handleError(error);
        // Set isStreaming to false on error
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === messageId ? { ...msg, isStreaming: false } : msg,
          ),
        );
      }
    },
    [messages, generateSummaries, processSummaries, handleError],
  );

  const abortMessage = useCallback(() => {
    // Abort all ongoing controllers
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });

    // Clear the Set after aborting
    abortControllersRef.current.clear();

    // Update all messages to set isStreaming to false
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.isStreaming ? { ...msg, isStreaming: false } : msg,
      ),
    );
  }, []);

  return {
    messages,
    isStreaming: messages.some((msg) => msg.isStreaming),
    submitMessage,
    abortMessage, // Global abort function
    error,
    clearError: () => setError(null),
    isLoading,
    loadMoreResults,
  };
};
