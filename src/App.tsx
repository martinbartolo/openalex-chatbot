import React from "react";
import ChatWindow from "./components/ChatWindow";
import ChatInput from "./components/ChatInput";
import { useChat } from "./hooks/useChat";
import { Snackbar, Alert } from "@mui/material";

const App: React.FC = () => {
  const {
    messages,
    isStreaming,
    currentResponse,
    submitMessage,
    abortMessage,
    error,
    clearError,
    isLoading,
    loadMoreResults,
    initialApiUrl,
    hasMoreResults,
  } = useChat();

  const handleSubmit = async (input: string) => {
    await submitMessage(input);
  };

  const handleCloseSnackbar = (
    _: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === "clickaway") return;
    clearError();
  };

  return (
    <div className="flex flex-col min-h-screen max-w-screen-md mx-auto">
      <ChatWindow
        messages={messages}
        isStreaming={isStreaming}
        currentResponse={currentResponse}
        isLoading={isLoading}
        loadMoreResults={loadMoreResults}
        initialApiUrl={initialApiUrl ?? ""}
        hasMoreResults={hasMoreResults}
      />

      <div className="sticky bottom-0 bg-white pb-8">
        <ChatInput
          isStreaming={isStreaming}
          handleSubmit={handleSubmit}
          handleAbort={abortMessage}
        />
      </div>

      <Snackbar
        open={error !== null}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default App;
