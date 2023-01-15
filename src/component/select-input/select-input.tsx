import React, { useCallback, useState } from "react";
import { Key, Text, useInput } from "ink";

import { clamp } from "~src/helper/number.helper";
import { getUpDownIcons } from "~src/helper/string.helper";

import { SelectInputProps } from "./select-input.types";

export const SelectInput: React.FC<SelectInputProps> = ({ options, focus, onChange }) => {
  const [optionIndex, setOptionIndex] = useState<number>(0);

  const handleInput = useCallback(
    (input: string, key: Key): void => {
      let newIndex = optionIndex;

      if (key.upArrow) {
        newIndex = clamp(optionIndex - 1, 0, options.length - 1);
      } else if (key.downArrow) {
        newIndex = clamp(optionIndex + 1, 0, options.length - 1);
      }

      if (newIndex !== optionIndex) {
        setOptionIndex(newIndex);
        onChange(options[newIndex].value);
      }
    },
    [optionIndex, options, onChange]
  );

  useInput(handleInput, { isActive: focus });

  const hasUp = options.length > 1 && optionIndex > 0;
  const hasDown = options.length > 1 && optionIndex < options.length - 1;

  return (
    <Text>
      {getUpDownIcons(!!focus, hasUp, hasDown)} {options[optionIndex].label}
    </Text>
  );
};
