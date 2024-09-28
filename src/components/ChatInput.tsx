import React, { useState } from "react";
import { TextField, IconButton } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";

type ChatInputProps = {
  isStreaming: boolean;
  handleSubmit: (input: string) => void;
  handleAbort: () => void;
};

const ChatInput: React.FC<ChatInputProps> = ({
  isStreaming,
  handleSubmit,
  handleAbort,
}) => {
  const [input, setInput] = useState("");

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (input.trim()) {
      handleSubmit(input);
      setInput("");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit(event);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex justify-center px-2">
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

        {isStreaming ? (
          <IconButton
            type="button"
            color="secondary"
            aria-label="abort"
            onClick={handleAbort}
          >
            <CloseIcon />
          </IconButton>
        ) : (
          <IconButton
            type="submit"
            color="primary"
            aria-label="send"
            disabled={!input.trim()}
          >
            <SendIcon />
          </IconButton>
        )}
      </div>
    </form>
  );
};

export default ChatInput;
