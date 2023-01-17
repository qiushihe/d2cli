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

export type FormProps = {
  focus?: boolean;
  fields: FormField[];
  values?: Record<string, string>;
  validators?: Record<string, FormFieldValidator>;
  onChange?: (values: Record<string, string>) => void;
  onError?: (
    errors: Record<string, Record<string, string[]>>,
    values: Record<string, string>
  ) => void;
  onSubmit: (values: Record<string, string>) => void;
  onCancel: (values: Record<string, string>) => void;
};
