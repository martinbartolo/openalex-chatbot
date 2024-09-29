import React from "react";
import clsx from "clsx";
import PaperCard from "./PaperCard";
import { ProcessedOpenAlexRecord } from "../types";
import { NO_PAPERS_FOUND_EXPLANATION } from "../utils/constants";

type ChatMessageProps = {
  id: string;
  text: string;
  sender: "user" | "bot";
  initialApiUrl: string | null;
  loadMoreResults: (messageId: string) => void;
  hasMoreResults: boolean;
  isStreaming: boolean;
};

const ChatMessage: React.FC<ChatMessageProps> = ({
  id,
  text,
  sender,
  initialApiUrl,
  loadMoreResults,
  hasMoreResults,
  isStreaming,
}) => {
  const isProcessedData = sender === "bot" && text.startsWith("[");

  if (isProcessedData) {
    const processedData: ProcessedOpenAlexRecord[] = JSON.parse(text);

    if (processedData.length === 0 && !isStreaming) {
      return (
        <div className="self-start pb-6">
          <span className="text-black">{NO_PAPERS_FOUND_EXPLANATION}</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center w-full pb-12">
        <div className="flex flex-wrap justify-center">
          {processedData.map((paper, index) => (
            <PaperCard key={`${index}-${paper.title}`} {...paper} />
          ))}
        </div>

        {initialApiUrl && hasMoreResults && !isStreaming && (
          <button onClick={() => loadMoreResults(id)} className="mt-4">
            <span className="text-black hover:underline">Load More</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "flex",
        sender === "bot"
          ? "self-start pb-6"
          : "bg-blue-500 self-end py-2 px-4 max-w-lg rounded-3xl",
      )}
    >
      <span
        className={clsx(
          "text",
          sender === "bot" ? "text-black" : "text-white font-medium",
        )}
      >
        {text}
      </span>
    </div>
  );
};

export default React.memo(ChatMessage);
