import { FormProps as BaseFormProps } from "~src/component/form/form.types";

export enum RepeatOption {
  NoRepeat = "no-repeat",
  Daily = "daily",
  Weekdays = "weekdays",
  Weekly = "weekly",
  Monthly = "monthly",
  Annual = "annual"
}

export enum Weekday {
  Su = "sunday",
  Mo = "monday",
  Tu = "tuesday",
  We = "wednesday",
  Th = "thursday",
  Fr = "friend",
  Sa = "saturday"
}

export type EventFormValues = {
  title: string;
  date: string;
  repeat?: RepeatOption;
  weekdays?: string; // Comma separated values of `Weekday`
  endDate?: string;
  notes?: string;
};

type FormProps = BaseFormProps<EventFormValues>;

export type EventFormProps = {
  focus?: FormProps["focus"];
  values?: FormProps["values"];
  onChange?: FormProps["onChange"];
  onError?: FormProps["onError"];
  onSubmit: FormProps["onSubmit"];
  onCancel: FormProps["onCancel"];
};
