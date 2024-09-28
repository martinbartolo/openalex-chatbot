import React, { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";
import LoadingIndicator from "./LoadingIndicator";

type ChatWindowProps = {
  messages: { text: string; sender: "user" | "bot" }[];
  isStreaming: boolean;
  currentResponse: string;
  isLoading: boolean;
  initialApiUrl: string;
  loadMoreResults: () => void;
  hasMoreResults: boolean;
};

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isStreaming,
  currentResponse,
  isLoading,
  loadMoreResults,
  initialApiUrl,
  hasMoreResults,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom of the chat window smoothly when messages are updated
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Make sure we maintain the scroll to the bottom as a new response is streamed
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView();
  }, [currentResponse]);

  return (
    <div className="flex-grow overflow-auto p-4">
      <div className="space-y-8 flex flex-col">
        {messages.map((msg, index) => (
          <ChatMessage
            key={index}
            text={msg.text}
            sender={msg.sender}
            initialApiUrl={initialApiUrl}
            loadMoreResults={loadMoreResults}
            hasMoreResults={hasMoreResults}
          />
        ))}

        {isStreaming && currentResponse && (
          <ChatMessage
            text={currentResponse}
            sender="bot"
            initialApiUrl={initialApiUrl}
            loadMoreResults={loadMoreResults}
            hasMoreResults={hasMoreResults}
          />
        )}

        {isLoading && <LoadingIndicator />}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
};

export default React.memo(ChatWindow);
