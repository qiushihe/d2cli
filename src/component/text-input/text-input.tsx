import React, { useCallback, useEffect, useState } from "react";
import chalk from "chalk";
import { Key, Text, useInput } from "ink";

import { clamp } from "~src/helper/number.helper";

import { TextInputProps } from "./text-input.types";

export const TextInput: React.FC<TextInputProps> = ({
  focus,
  value,
  onChange,
  cursorState,
  multiline,
  placeholder,
  maxLength
}) => {
  const ownCursorState = useState<number>((value || "").length);
  const [cursorOffset, setCursorOffset] = cursorState || ownCursorState;

  // Adjust cursor offset based on value and focus change.
  useEffect(() => {
    // Whenever `value` or `focus` change ...
    setCursorOffset((prevCursorOffset) => {
      // If we currently have focus ...
      if (focus) {
        const stringValue = value || "";

        // ... if the value is longer than the previous cursor offset ...
        if (prevCursorOffset > stringValue.length - 1) {
          // ... then shorten cursor offset to match new value length.
          return stringValue.length;
        }
        // ... if the value is not longer than the previous cursor offset ...
        else {
          // ... then keep cursor offset unchanged.
          return prevCursorOffset;
        }
      }
      // If we currently do not have focus ...
      else {
        // ... then keep cursor offset unchanged.
        return prevCursorOffset;
      }
    });
  }, [value, focus, setCursorOffset]);

  const handleInput = useCallback(
    (_input: string, key: Key): void => {
      let input = _input;

      // If we want multi-line support ...
      if (multiline) {
        // ... then we take the input's return character ...
        if (input === "\r") {
          // ... and replace it with the newline character so the field value would render as
          // actually multiple lines.
          input = "\n";
        }
      }
      // If we don't want multi-line support ...
      else {
        // ... then we take the input's return character ...
        if (input === "\r") {
          // ... and swallow/ignore it.
          input = "";
        }
      }

      if (
        key.upArrow ||
        key.downArrow ||
        (key.ctrl && input === "c") ||
        key.tab ||
        (key.shift && key.tab)
      ) {
        return;
      }

      let nextCursorOffset = cursorOffset;
      let nextValue = value;

      if (key.leftArrow) {
        nextCursorOffset--;
      } else if (key.rightArrow) {
        nextCursorOffset++;
      } else if (key.backspace || key.delete) {
        if (cursorOffset > 0) {
          nextValue = value.slice(0, cursorOffset - 1) + value.slice(cursorOffset, value.length);
          nextCursorOffset--;
        }
      } else {
        nextValue = value.slice(0, cursorOffset) + input + value.slice(cursorOffset, value.length);
        nextCursorOffset += input.length;
      }

      if (cursorOffset < 0) {
        nextCursorOffset = 0;
      }

      if (cursorOffset > value.length) {
        nextCursorOffset = value.length;
      }

      if (maxLength && maxLength > 0) {
        setCursorOffset(clamp(nextCursorOffset, 0, maxLength));
      } else {
        setCursorOffset(nextCursorOffset);
      }

      if (nextValue !== value) {
        if (maxLength && maxLength > 0) {
          onChange(nextValue.slice(0, maxLength));
        } else {
          onChange(nextValue);
        }
      }
    },
    [cursorOffset, multiline, onChange, value, setCursorOffset, maxLength]
  );

  useInput(handleInput, { isActive: focus });

  let renderedValue = value;
  let renderedPlaceholder = placeholder ? chalk.grey(placeholder) : undefined;

  // Render a fake cursor, because it's too inconvenient to deal with actual cursor and ansi
  // escapes characters
  if (focus) {
    renderedPlaceholder =
      placeholder && placeholder.length > 0
        ? chalk.inverse(placeholder[0]) + chalk.grey(placeholder.slice(1))
        : chalk.inverse(" ");

    renderedValue = value.length > 0 ? "" : chalk.inverse(" ");

    for (let characterIndex = 0; characterIndex < value.length; characterIndex++) {
      const character = value[characterIndex];

      if (characterIndex >= cursorOffset && characterIndex <= cursorOffset) {
        renderedValue += chalk.inverse(character);
      } else {
        renderedValue += character;
      }
    }

    if (value.length > 0 && cursorOffset === value.length) {
      renderedValue += chalk.inverse(" ");
    }
  }

  return (
    <Text>
      {placeholder ? (value.length > 0 ? renderedValue : renderedPlaceholder) : renderedValue}
    </Text>
  );
};
