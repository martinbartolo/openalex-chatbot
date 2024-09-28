import React from "react";
import { Typography } from "@mui/material";
import "../styles/LoadingIndicator.css";

const LoadingIndicator: React.FC = () => {
  return (
    <Typography variant="body1" color="textSecondary">
      Loading
      <span className="dots" />
    </Typography>
  );
};

export default LoadingIndicator;
