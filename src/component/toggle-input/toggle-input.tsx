import React, { useCallback, useEffect, useState } from "react";
import { Text, useInput } from "ink";

import { ToggleInputTypes } from "./toggle-input.types";

export const ToggleInput: React.FC<ToggleInputTypes> = ({ focus, value, onChange }) => {
  const [isActive, setIsActive] = useState<boolean>(value === "true");

  useEffect(() => {
    if (isActive && value !== "true") {
      onChange("true");
    } else if (!isActive && value !== "false") {
      onChange("false");
    }
  }, [isActive, value, onChange]);

  const handleInput = useCallback(
    (input: string): void => {
      if (input === " ") {
        setIsActive(!isActive);
      }
    },
    [isActive]
  );

  useInput(handleInput, { isActive: focus });

  const renderedText = isActive ? "◉ Yes" : "○ No ";

  return <Text>{renderedText}</Text>;
};
