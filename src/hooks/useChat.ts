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

/**
 * `useChat` is a custom React hook that manages chat messages,
 * interacts with OpenAI and OpenAlex APIs, handles streaming,
 * and provides functions to submit messages, abort ongoing streams,
 * and load more results.
 */
export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const abortControllersRef = useRef<Set<AbortController>>(new Set());

  /**
   * Adds a new message to the chat.
   * @param message - The text content of the message.
   * @param sender - Indicates if the message is from the "user" or the "bot".
   * @param metadata - Optional additional properties for the message.
   */
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

  /**
   * Handles errors by setting appropriate error messages
   * and removing the loading state from bot messages.
   * @param error - The caught error object.
   */
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

    // Remove the loading state from all bot messages
    setMessages((prevMessages) =>
      prevMessages.map((msg) => {
        if (msg.sender === "bot") {
          try {
            const currentData: ProcessedOpenAlexRecord[] = JSON.parse(msg.text);
            const updatedData = currentData.map((item) => ({
              ...item,
              loading: false,
            }));
            return {
              ...msg,
              text: JSON.stringify(updatedData),
              isStreaming: false,
            };
          } catch (parseError) {
            console.error("Failed to parse message text:", parseError);
            return msg;
          }
        }
        return msg;
      }),
    );
  }, []);

  /**
   * Initiates a streaming request to generate summaries based on titles.
   * @param titles - An array of paper titles to summarize.
   * @param signal - The AbortSignal to control the request lifecycle.
   * @returns An async iterable stream of ChatCompletionChunk.
   */
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

  /**
   * Processes the incoming stream of summaries and updates the chat messages accordingly.
   * @param stream - The async iterable stream from OpenAI.
   * @param apiData - The response data from OpenAlex API.
   * @param updateFunction - A callback to update individual processed records.
   * @param messageId - The ID of the bot message being updated.
   * @param abortSignal - The AbortSignal to handle stream termination.
   */
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
        // Exit early if the stream has been aborted
        if (abortSignal.aborted) {
          break;
        }

        // Accumulate the content from each chunk
        const content = chunk.choices[0]?.delta?.content || "";
        currentSummary += content;

        // Check for the delimiter indicating the end of a summary
        if (content.includes("---")) {
          const [summary, ...rest] = currentSummary.split("---");
          currentSummary = rest.join("---");

          // Add the summary to the message
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

            // Update the message only if not aborted
            if (!abortSignal.aborted) {
              updateFunction(processedRecord, processedCount, messageId);
            }
            processedCount++;
          }
        }
      }

      // Handle any remaining summary after the loop ends
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

  /**
   * Submits a new user message, interacts with OpenAI and OpenAlex APIs,
   * and handles the streaming of summaries.
   * @param input - The user's message input.
   */
  const submitMessage = useCallback(
    async (input: string) => {
      if (!input.trim()) return;

      setIsLoading(true);
      addMessageToChat(input, "user");

      try {
        // Parse the user's message with OpenAI to get the OpenAlex API URL
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

        // Handle cases where the search is invalid or no API URL is returned
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
        abortControllersRef.current.add(abortController);

        // Initialize the bot message with an empty array
        addMessageToChat(JSON.stringify([]), "bot", {
          apiUrl: parsedResponse.api_url,
          currentPage: 1,
          hasMoreResults: true,
          isStreaming: true,
          id: newBotMessageId,
        });

        // Fetch data from OpenAlex API
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

        // Populate the bot message with loading placeholders
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

        // Generate summaries by streaming from OpenAI
        const stream = await generateSummaries(titles, abortController.signal);

        setIsLoading(false);

        // Process the incoming summaries and update the chat messages
        await processSummaries(
          stream,
          apiData,
          // Function to update the message with the processed data
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

        // Remove the AbortController from the Set after processing completes
        abortControllersRef.current.delete(abortController);
      } catch (error: unknown) {
        handleError(error);
      } finally {
        setIsLoading(false);
      }
    },
    [addMessageToChat, handleError, generateSummaries, processSummaries],
  );

  /**
   * Loads more results for a specific bot message by fetching the next page from OpenAlex API.
   * @param messageId - The ID of the bot message to load more results for.
   */
  const loadMoreResults = useCallback(
    async (messageId: string) => {
      const targetMessage = messages.find(
        (msg) => msg.id === messageId && msg.sender === "bot",
      );

      // Exit if the target message is not found or has no more results
      if (
        !targetMessage ||
        !targetMessage.apiUrl ||
        !targetMessage.hasMoreResults
      )
        return;

      const nextPage = (targetMessage.currentPage || 1) + 1;

      const abortController = new AbortController();
      abortControllersRef.current.add(abortController);

      // Update the message to indicate that more results are being fetched
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId
            ? { ...msg, currentPage: nextPage, isStreaming: true }
            : msg,
        ),
      );

      try {
        // Fetch the next page from OpenAlex API
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

        // Generate summaries for the new set of titles
        const stream = await generateSummaries(titles, abortController.signal);

        // Process the incoming summaries and update the chat messages
        await processSummaries(
          stream,
          apiData,
          // Function to update the message with the processed data
          (processedData, index, msgId) => {
            setMessages((prevMessages) =>
              prevMessages.map((msg) => {
                if (msg.id === msgId && msg.sender === "bot") {
                  const currentData: ProcessedOpenAlexRecord[] = JSON.parse(
                    msg.text,
                  );
                  const targetIndex =
                    currentData.length - titles.length + index;
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

        // Remove the AbortController from the Set after processing completes
        abortControllersRef.current.delete(abortController);
      } catch (error: unknown) {
        handleError(error);
      } finally {
        // Ensure that isStreaming is set to false in all cases
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === messageId ? { ...msg, isStreaming: false } : msg,
          ),
        );
      }
    },
    [messages, generateSummaries, processSummaries, handleError],
  );

  /**
   * Aborts all ongoing streams by invoking abort on each AbortController.
   * Also updates all messages to set isStreaming to false and remove loading state.
   */
  const abortMessage = useCallback(() => {
    // Abort all ongoing AbortControllers
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });

    // Clear the Set after aborting
    abortControllersRef.current.clear();

    // Update all messages to indicate that streaming has stopped
    // and remove loading state from cards
    setMessages((prevMessages) =>
      prevMessages.map((msg) => {
        if (msg.isStreaming && msg.sender === "bot") {
          try {
            const currentData: ProcessedOpenAlexRecord[] = JSON.parse(msg.text);
            const updatedData = currentData.map((item) => ({
              ...item,
              loading: false,
            }));
            return {
              ...msg,
              isStreaming: false,
              text: JSON.stringify(updatedData),
            };
          } catch (parseError) {
            console.error(
              "Failed to parse message text during abort:",
              parseError,
            );
            return msg;
          }
        }
        return msg;
      }),
    );
  }, []);

  /**
   * The hook returns the following:
   * - messages: The array of chat messages.
   * - submitMessage: Function to submit a new user message.
   * - abortMessage: Function to abort all ongoing streams.
   * - loadMoreResults: Function to load more results for a specific message.
   * - isStreaming: A boolean indicating if any message is currently streaming.
   * - isLoading: Boolean indicating that we are waiting for streaming of summaries to begin.
   * - error: Current error message, if any.
   * - clearError: Function to clear the error message.
   */
  return {
    messages,
    submitMessage,
    abortMessage,
    loadMoreResults,
    isStreaming: messages.some((msg) => msg.isStreaming),
    isLoading,
    error,
    clearError: () => setError(null),
  };
};
