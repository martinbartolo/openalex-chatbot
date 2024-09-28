import React, { useState, useCallback } from "react";
import ChatWindow from "./components/ChatWindow";
import ChatInput from "./components/ChatInput";
import { useChat } from "./hooks/useChat";

const App: React.FC = () => {
  const {
    messages,
    isStreaming,
    currentResponse,
    submitMessage,
    abortMessage,
  } = useChat();
  const [input, setInput] = useState<string>("");

  const handleSubmit = useCallback(async () => {
    setInput("");
    await submitMessage(input);
  }, [input, submitMessage]);

  return (
    <div className="flex flex-col min-h-screen max-w-screen-md mx-auto">
      <ChatWindow
        messages={messages}
        isStreaming={isStreaming}
        currentResponse={currentResponse}
      />

      <div className="sticky bottom-0 bg-white pb-8">
        <ChatInput
          input={input}
          setInput={setInput}
          isStreaming={isStreaming}
          handleSubmit={handleSubmit}
          handleAbort={abortMessage}
        />
      </div>
    </div>
  );
};

export default App;
