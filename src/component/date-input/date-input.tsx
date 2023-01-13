import React, { useCallback, useState } from "react";
import { Key, useInput } from "ink";

import { TextInput } from "~src/component/text-input";
import { clamp } from "~src/helper/number.helper";
import { replaceRange } from "~src/helper/string.helper";

import { DateInputProps } from "./date-input.types";

export const DateInput: React.FC<DateInputProps> = ({ focus, value, onChange }) => {
  const [cursorOffset, setCursorOffset] = useState<number>((value || "").length);

  const handleChange = useCallback(
    (newValue: string) => {
      // We need the `value` passed into `TextInput` to actually "change" in order to trigger
      // the cursor offset re-calculation effect.
      // So that's why we first call `onChange` with the original `newValue` ...
      onChange(newValue);

      // ... then call `onChange` again with the sanitized value.
      // This way the `value` passed into `TextInput` would have actually "changed" (twice, in
      // this case), and the cursor offset re-calculation effect would run to update the
      // `TextInput`'s cursor position.
      setTimeout(() => {
        if (!newValue || newValue.length <= 0) {
          return;
        }

        const digits = (newValue || "").trim().replace(/[^0-9]/gi, "");

        const sanitizedValues = [digits.slice(0, 4)];
        if (digits.length > 4) {
          sanitizedValues.push(digits.slice(4, 6));
        }
        if (digits.length > 6) {
          sanitizedValues.push(digits.slice(6, 8));
        }

        const sanitizedValue = sanitizedValues.join("/");
        if (
          sanitizedValue.length == 4 ||
          sanitizedValue.length == 7 ||
          sanitizedValue.length === 10
        ) {
          const clampedValue = sanitizedValue
            .split("/")
            .map((part, index) => {
              if (index === 0) {
                return `${clamp(parseInt(part), 1, 9999) || 0}`.padStart(4, "0");
              } else if (index === 1) {
                return `${clamp(parseInt(part), 1, 12) || 0}`.padStart(2, "0");
              } else if (index === 2) {
                return `${clamp(parseInt(part), 1, 31) || 0}`.padStart(2, "0");
              } else {
                return part;
              }
            })
            .join("/");

          if (sanitizedValue.length < 10) {
            onChange(`${clampedValue}/`);
            setCursorOffset(clampedValue.length + 1);
          } else {
            onChange(clampedValue);
          }
        } else {
          onChange(sanitizedValue);
        }
      }, 1);
    },
    [onChange]
  );

  const handleUserInput = useCallback(
    (input: string, key: Key): void => {
      let adjustment: {
        range: [number, number];
        bound: [number, number];
        length: number;
      } | null = null;

      if (value && value.length > 0) {
        if (cursorOffset >= 0 && cursorOffset <= 3) {
          adjustment = {
            range: [0, 3],
            bound: [1, 9999],
            length: 4
          };
        } else if (cursorOffset === 5 || cursorOffset === 6) {
          adjustment = {
            range: [5, 6],
            bound: [1, 12],
            length: 2
          };
        } else if (cursorOffset === 8 || cursorOffset === 9 || cursorOffset === 10) {
          adjustment = {
            range: [8, 9],
            bound: [1, 31],
            length: 2
          };
        }
      }

      if (adjustment) {
        const rangeValue = parseInt(value.slice(adjustment.range[0], adjustment.range[1] + 1)) || 0;
        let newRangeValue = rangeValue;

        if (key.upArrow) {
          if (key.shift) {
            newRangeValue = rangeValue + 10;
          } else {
            newRangeValue = rangeValue + 1;
          }
        } else if (key.downArrow) {
          if (key.shift) {
            newRangeValue = rangeValue - 10;
          } else {
            newRangeValue = rangeValue - 1;
          }
        }

        newRangeValue = clamp(newRangeValue, adjustment.bound[0], adjustment.bound[1]);

        if (newRangeValue !== rangeValue) {
          onChange(
            replaceRange(
              value,
              adjustment.range[0],
              adjustment.range[1] + 1,
              `${newRangeValue}`.padStart(adjustment.length, "0")
            )
          );
        }
      }
    },
    [cursorOffset, value, onChange]
  );

  useInput(handleUserInput, { isActive: focus });

  return (
    <TextInput
      focus={focus}
      value={value}
      onChange={handleChange}
      cursorState={[cursorOffset, setCursorOffset]}
      multiline={false}
      placeholder={"YYYY/MM/DD"}
      maxLength={10}
    />
  );
};
