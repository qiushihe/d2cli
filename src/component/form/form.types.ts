export type FormInputProps = {
  focus?: boolean;
  value: string;
  onChange: (value: string) => void;
};

export type FormField = {
  name: string;
  type: "text" | "textarea" | "date" | "select";
  label: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
};

export type FormProps = {
  focus?: boolean;
  fields: FormField[];
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
};
