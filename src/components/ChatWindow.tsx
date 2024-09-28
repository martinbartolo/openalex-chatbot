import React, { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";

type ChatWindowProps = {
  messages: { text: string; sender: "user" | "bot" }[];
  isStreaming: boolean;
  currentResponse: string;
};

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isStreaming,
  currentResponse,
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
          <ChatMessage key={index} text={msg.text} sender={msg.sender} />
        ))}

        {isStreaming && currentResponse && (
          <ChatMessage text={currentResponse} sender="bot" />
        )}

        <div className="h-4" />
      </div>

      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow;
