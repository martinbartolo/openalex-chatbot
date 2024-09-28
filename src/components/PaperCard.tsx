import React from "react";
import { Card, CardContent } from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LockIcon from "@mui/icons-material/Lock";

type PaperCardProps = {
  title: string;
  link: string | null;
  date: string;
  citations: number;
  isOpenAccess: boolean;
};

const PaperCard: React.FC<PaperCardProps> = ({
  title,
  link,
  date,
  citations,
  isOpenAccess,
}) => {
  return (
    <Card
      variant="outlined"
      className="m-4 w-full max-w-[300px] transition-all duration-300 ease-in-out hover:-translate-y-1"
    >
      <CardContent>
        <h3 className="flex items-start mb-3 text-lg font-semibold">
          <a
            href={link ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center hover:underline"
          >
            {title}
          </a>
        </h3>

        <div className="flex items-center mb-2">
          <CalendarTodayIcon className="mr-2 text-gray-500 text-sm" />
          <span className="text-sm text-gray-600">{date}</span>
        </div>

        <div className="flex items-center mb-2">
          <FormatQuoteIcon className="mr-2 text-gray-500 text-sm" />
          <span className="text-sm text-gray-600">{citations} Citations</span>
        </div>

        <div className="flex items-center">
          {isOpenAccess ? (
            <LockOpenIcon className="mr-2 text-gray-500 text-sm" />
          ) : (
            <LockIcon className="mr-2 text-gray-500 text-sm" />
          )}
          <span className="text-sm text-gray-600">
            {isOpenAccess ? "Open Access" : "Closed Access"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaperCard;
