import { FormProps } from "~src/component/form/form.types";

export type EventFormProps = {
  focus?: FormProps["focus"];
  values?: FormProps["values"];
  onChange?: FormProps["onChange"];
  onError?: FormProps["onError"];
  onSubmit: FormProps["onSubmit"];
  onCancel: FormProps["onCancel"];
};
