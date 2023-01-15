import { FormInputProps } from "~src/component/form";

export type ChoiceInputTypes = FormInputProps & {
  options: { label: string; value: string }[];
};
