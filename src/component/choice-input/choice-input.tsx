import React, { useCallback, useEffect, useState } from "react";
import { Key, Text, useInput } from "ink";

import { clamp } from "~src/helper/number.helper";

import { ChoiceInputTypes } from "./choice-input.types";

export const ChoiceInput: React.FC<ChoiceInputTypes> = ({ focus, options, value, onChange }) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  const selectedValues = value.split(",").map((key) => decodeURIComponent(key));
  const [selection, setSelection] = useState<Record<string, boolean>>(
    options.reduce(
      (acc, option) => ({ ...acc, [option.value]: selectedValues.includes(option.value) }),
      {} as Record<string, boolean>
    )
  );

  useEffect(() => {
    const newValue = Object.keys(selection)
      .filter((key) => selection[key])
      .map((key) => encodeURIComponent(key))
      .join(",");
    if (newValue !== value) {
      onChange(newValue);
    }
  }, [selection, value, onChange]);

  const handleInput = useCallback(
    (input: string, key: Key): void => {
      if (key.rightArrow) {
        setFocusedIndex(clamp(focusedIndex + 1, 0, options.length - 1));
      } else if (key.leftArrow) {
        setFocusedIndex(clamp(focusedIndex - 1, 0, options.length - 1));
      }

      if (input === " ") {
        setSelection({
          ...selection,
          [options[focusedIndex].value]: !selection[options[focusedIndex].value]
        });
      }
    },
    [focusedIndex, options, selection]
  );

  useInput(handleInput, { isActive: focus });

  const renderedText = options
    .map((option, index) => {
      let icon: string;
      if (selection[option.value]) {
        icon = focus && index === focusedIndex ? "›◉" : " ◉";
      } else {
        icon = focus && index === focusedIndex ? "›○" : " ○";
      }

      return `${icon} ${option.label}`;
    })
    .join(" ");

  return <Text>{renderedText}</Text>;
};
