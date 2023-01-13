import { FormInputProps } from "~src/component/form";

export type SelectInputProps = FormInputProps & {
  options: { label: string; value: string }[];
};
