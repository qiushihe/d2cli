import React, { useCallback, useState } from "react";
import { Key, Text, useInput } from "ink";

import { clamp } from "~src/helper/number.helper";

import { SelectInputProps } from "./select-input.types";

export const SelectInput: React.FC<SelectInputProps> = ({ options, focus, onChange }) => {
  const [optionIndex, setOptionIndex] = useState<number>(0);

  const handleUserInput = useCallback(
    (input: string, key: Key): void => {
      let newIndex = optionIndex;

      if (key.leftArrow) {
        newIndex = clamp(optionIndex - 1, 0, options.length - 1);
      } else if (key.rightArrow) {
        newIndex = clamp(optionIndex + 1, 0, options.length - 1);
      }

      if (newIndex !== optionIndex) {
        setOptionIndex(newIndex);
        onChange(options[newIndex].value);
      }
    },
    [optionIndex, options, onChange]
  );

  useInput(handleUserInput, { isActive: focus });

  const leftIcon = optionIndex > 0 ? "◀" : "◁";
  const rightIcon = optionIndex < options.length - 1 ? "▶" : "▷";

  return (
    <Text>
      {leftIcon} {rightIcon} {options[optionIndex].label}
    </Text>
  );
};
