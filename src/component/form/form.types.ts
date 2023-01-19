export type FormInputProps = {
  focus?: boolean;
  value: string;
  onChange: (value: string) => void;
};

export type FormFieldType = "text" | "textarea" | "date" | "select" | "choice";

export type FormFieldValidator = (
  value: string | null | undefined,
  values: Record<string, string | null | undefined>
) => Record<string, string[]>;

export type BaseFormField<TType extends FormFieldType> = {
  name: string;
  type: TType;
  label: string;
  active?: boolean;
};

export type TextFormField = BaseFormField<"text"> & {
  placeholder?: string;
};

export type TextAreaFormField = BaseFormField<"textarea"> & {
  placeholder?: string;
};

export type DateFormField = BaseFormField<"date"> & {
  _?: never;
};

export type SelectFormField = BaseFormField<"select"> & {
  options: { label: string; value: string }[];
};

export type ChoiceFormField = BaseFormField<"choice"> & {
  options: { label: string; value: string }[];
};

export type FormField =
  | TextFormField
  | TextAreaFormField
  | DateFormField
  | SelectFormField
  | ChoiceFormField;

export type FormProps<TValues = Record<string, string>> = {
  focus?: boolean;
  fields: FormField[];
  values?: TValues;
  validators?: Record<string, FormFieldValidator>;
  onChange?: (values: TValues) => void;
  onError?: (errors: Record<string, Record<string, string[]>>, values: TValues) => void;
  onSubmit: (values: TValues) => void;
  onCancel: (values: TValues) => void;
};
