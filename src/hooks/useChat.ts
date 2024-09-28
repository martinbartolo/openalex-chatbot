import { useState, useRef, useCallback } from "react";
import { openai } from "../utils/openai";
import { MODEL } from "../utils/constants";

type Message = {
  text: string;
  sender: "user" | "bot";
};

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [currentResponse, setCurrentResponse] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

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

      addMessageToChat(input, "user");
      setIsStreaming(true);

      try {
        const stream = await openai.chat.completions.create({
          model: MODEL,
          messages: [{ role: "user", content: input }],
          stream: true,
        });

        abortControllerRef.current = stream.controller;

        let finalResponse = "";
        for await (const chunk of stream) {
          const payload = chunk.choices[0]?.delta?.content;
          if (payload) {
            finalResponse += payload;
            setCurrentResponse(finalResponse);
          }
        }

        addMessageToChat(finalResponse, "bot");
      } catch (error) {
        if (abortControllerRef.current?.signal.aborted) {
          console.log("Stream aborted by user.");
        } else {
          console.error(error);
        }
      } finally {
        setIsStreaming(false);
        setCurrentResponse("");
      }
    },
    [addMessageToChat],
  );

  const abortMessage = useCallback(() => {
    abortControllerRef.current?.abort();
    addMessageToChat(currentResponse, "bot");
  }, [addMessageToChat, currentResponse]);

  return {
    messages,
    isStreaming,
    currentResponse,
    submitMessage,
    abortMessage,
  };
};
