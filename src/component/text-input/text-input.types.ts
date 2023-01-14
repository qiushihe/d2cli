import React from "react";

import { FormInputProps } from "~src/component/form";

export type TextInputProps = FormInputProps & {
  cursorState?: [number, React.Dispatch<React.SetStateAction<number>>];
  multiline?: boolean;
  placeholder?: string;
  maxLength?: number;
};
