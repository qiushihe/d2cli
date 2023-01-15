import React, { useCallback, useEffect, useState } from "react";
import chalk from "chalk";
import { Key, Text, useInput } from "ink";

import { usePrevious } from "~src/helper/hook.helper";
import { clamp } from "~src/helper/number.helper";

import { DateInputProps } from "./date-input.types";

const clampCursorOffset = (value: number) => clamp(value, 0, 10);

export const DateInput: React.FC<DateInputProps> = ({ focus, value, onChange }) => {
  const valueParts = (value || "").split("/", 3) as [string?, string?, string?];
  const [yearString, setYearString] = useState<string>(valueParts[0] || "");
  const [monthString, setMonthString] = useState<string>(valueParts[1] || "");
  const [dayString, setDayString] = useState<string>(valueParts[2] || "");

  const [cursorOffset, setCursorOffset] = useState<number>(0);
  const previousCursorOffset = usePrevious(cursorOffset);
  const [focusedComponent, setFocusedComponent] = useState<"year" | "month" | "day" | null>(null);

  useEffect(() => {
    if (cursorOffset <= 3) {
      setFocusedComponent("year");
    } else if (cursorOffset === 5 || cursorOffset === 6) {
      setFocusedComponent("month");
    } else if (cursorOffset === 8 || cursorOffset === 9) {
      setFocusedComponent("day");
    } else {
      setFocusedComponent(null);
    }
  }, [cursorOffset]);

  useEffect(() => {
    if (previousCursorOffset === 3 && cursorOffset === 4) {
      setCursorOffset(5);
    } else if (previousCursorOffset === 5 && cursorOffset === 4) {
      setCursorOffset(3);
    } else if (previousCursorOffset === 6 && cursorOffset === 7) {
      setCursorOffset(8);
    } else if (previousCursorOffset === 8 && cursorOffset === 7) {
      setCursorOffset(6);
    }
  }, [previousCursorOffset, cursorOffset]);

  useEffect(() => {
    const newValue = [yearString, monthString, dayString].filter((item) => !!item).join("/");
    if (newValue !== value) {
      onChange(newValue);
    }
  }, [yearString, monthString, dayString, value, onChange]);

  const handleInput = useCallback(
    (input: string, key: Key): void => {
      if (`${input || ""}`.match(/[0-9]/)) {
        if (focusedComponent === "year") {
          setYearString(yearString + input);
          setCursorOffset(clampCursorOffset(cursorOffset + 1));
        } else if (focusedComponent === "month") {
          setMonthString(monthString + input);
          setCursorOffset(clampCursorOffset(cursorOffset + 1));
        } else if (focusedComponent === "day") {
          setDayString(dayString + input);
          setCursorOffset(clampCursorOffset(cursorOffset + 1));
        }
      } else if (key.backspace || key.delete) {
        if (focusedComponent === "year" || cursorOffset === 5) {
          setYearString(yearString.slice(0, yearString.length - 1));
          setCursorOffset(clampCursorOffset(cursorOffset - 1));
        } else if (focusedComponent === "month" || cursorOffset === 8) {
          setMonthString(monthString.slice(0, monthString.length - 1));
          setCursorOffset(clampCursorOffset(cursorOffset - 1));
        } else if (focusedComponent === "day" || cursorOffset === 10) {
          setDayString(dayString.slice(0, dayString.length - 1));
          setCursorOffset(clampCursorOffset(cursorOffset - 1));
        }
      }
    },
    [cursorOffset, focusedComponent, yearString, monthString, dayString]
  );

  useInput(handleInput, { isActive: focus });

  const yearPlaceholderLength = 4 - yearString.length;
  const monthPlaceholderLength = 2 - monthString.length;
  const dayPlaceholderLength = 2 - dayString.length;

  const renderedCharacters = [
    `${yearString + "YYYY".slice(0, yearPlaceholderLength)}`,
    `${monthString + "MM".slice(0, monthPlaceholderLength)}`,
    `${dayString + "DD".slice(0, dayPlaceholderLength)}`
  ]
    .join("/")
    .split("");

  // Render an extra character at the end so the cursor can go there.
  renderedCharacters.push(" ");

  if (yearPlaceholderLength > 0) {
    for (
      let charIndex = yearString.length;
      charIndex < yearString.length + yearPlaceholderLength;
      charIndex++
    ) {
      renderedCharacters[charIndex] = chalk.grey(renderedCharacters[charIndex]);
    }
  }

  if (monthPlaceholderLength > 0) {
    for (
      let charIndex = 5 + monthString.length;
      charIndex < 5 + monthString.length + monthPlaceholderLength;
      charIndex++
    ) {
      renderedCharacters[charIndex] = chalk.grey(renderedCharacters[charIndex]);
    }
  }

  if (dayPlaceholderLength > 0) {
    for (
      let charIndex = 8 + dayString.length;
      charIndex < 8 + dayString.length + dayPlaceholderLength;
      charIndex++
    ) {
      renderedCharacters[charIndex] = chalk.grey(renderedCharacters[charIndex]);
    }
  }

  if (focus) {
    renderedCharacters[cursorOffset] = chalk.inverse(renderedCharacters[cursorOffset]);
  }

  return <Text>{renderedCharacters.join("")}</Text>;
};
