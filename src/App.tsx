import React, { useState, FormEvent, useEffect, useRef } from "react";
import { TextField, IconButton } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

const App: React.FC = () => {
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<string[]>([]); // State to hold chat messages

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (input.trim()) {
      setMessages([...messages, input]); // Add the user's input to messages
      setInput(""); // Clear the input field
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      // New line on Shift + Enter
      if (event.shiftKey) {
        return;
      }
      // Submit on Enter
      event.preventDefault();
      handleSubmit(event as unknown as FormEvent<HTMLFormElement>);
    }
  };

  // Scroll to the bottom of the chat when messages change
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col min-h-screen max-w-screen-md mx-auto">
      <div className="flex-grow overflow-auto p-4">
        <div className="space-y-2 flex flex-col">
          {messages.map((msg, index) => (
            <div
              key={index}
              className="bg-blue-500 py-2 px-4 max-w-lg flex rounded-3xl self-end"
            >
              <span className="text-white font-medium">{msg}</span>
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 bg-white pb-8">
        <form onSubmit={handleSubmit} className="flex justify-center px-2">
          <div className="flex items-center border border-black py-1 pl-4 pr-2 w-full rounded-3xl">
            <TextField
              multiline
              maxRows={10}
              fullWidth
              variant="standard"
              placeholder="Type a message..."
              aria-label="message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              slotProps={{
                input: {
                  disableUnderline: true,
                },
              }}
            />

            <IconButton
              type="submit"
              color="primary"
              aria-label="send"
              disabled={!input}
            >
              <SendIcon />
            </IconButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
