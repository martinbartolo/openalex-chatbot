import React, { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";
import LoadingIndicator from "./LoadingIndicator";
import { Message } from "../types";

type ChatWindowProps = {
  messages: Message[];
  isLoading: boolean;
  loadMoreResults: (messageId: string) => void;
};

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
  loadMoreResults,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom only when the user has sent a new message
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.sender === "user") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="flex-grow overflow-auto p-4">
      <div className="space-y-8 flex flex-col">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            id={msg.id}
            text={msg.text}
            sender={msg.sender}
            initialApiUrl={msg.apiUrl ?? null}
            loadMoreResults={() => loadMoreResults(msg.id)}
            hasMoreResults={msg.hasMoreResults || false}
            isStreaming={msg.isStreaming || false}
            introMessage={msg.introMessage}
          />
        ))}

        {isLoading && <LoadingIndicator />}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
};

export default React.memo(ChatWindow);
