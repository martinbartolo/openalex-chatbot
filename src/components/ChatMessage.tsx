import React from "react";
import clsx from "clsx";

type ChatMessageProps = {
  text: string;
  sender: "user" | "bot";
};

const ChatMessage: React.FC<ChatMessageProps> = ({ text, sender }) => {
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
