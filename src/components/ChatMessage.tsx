import React from "react";
import clsx from "clsx";
import PaperCard from "./PaperCard";
import { ProcessedOpenAlexRecord } from "../types";

type ChatMessageProps = {
  text: string;
  sender: "user" | "bot";
  initialApiUrl: string | null;
  loadMoreResults: () => void;
  hasMoreResults: boolean;
};

const ChatMessage: React.FC<ChatMessageProps> = ({
  text,
  sender,
  initialApiUrl,
  loadMoreResults,
  hasMoreResults,
}) => {
  const isProcessedData = sender === "bot" && text.startsWith("[");

  if (isProcessedData) {
    const processedData: ProcessedOpenAlexRecord[] = JSON.parse(text);

    return (
      <div className="flex flex-col items-center w-full pb-12">
        <div className="flex flex-wrap justify-center">
          {processedData.map((paper, index) => (
            <PaperCard key={index} {...paper} />
          ))}
        </div>
        {initialApiUrl && hasMoreResults && (
          <button onClick={loadMoreResults} className="mt-4">
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
        {text.split("\n").map((line, index) => (
          <React.Fragment key={index}>
            {line}
            {index < text.split("\n").length - 1 && <br />}
          </React.Fragment>
        ))}
      </span>
    </div>
  );
};

export default React.memo(ChatMessage);
