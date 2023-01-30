import React, { useState } from "react";
import * as yup from "yup";

import { Form } from "~src/component/form";
import { yupFormFieldValidator } from "~src/helper/validation.helper";
import { getDateStringError } from "~src/helper/validation.helper";

import { RepeatOption } from "./agenda-item-form.types";
import { Weekday } from "./agenda-item-form.types";
import { AgendaItemFormValues } from "./agenda-item-form.types";
import { AgendaItemFormProps } from "./agenda-item-form.types";

const shouldShowRepeatField = (values: Record<string, string>) =>
  (values["date"] || "").trim().length > 0;

const shouldShowWeekdaysField = (values: Record<string, string>) =>
  (values["repeat"] || "").trim() === "weekdays";

const shouldShowRepeatEndField = (values: Record<string, string>) => {
  const repeatValue = (values["repeat"] || "").trim();
  return repeatValue.length > 0 && repeatValue !== "no-repeat";
};

export const AgendaItemForm: React.FC<AgendaItemFormProps> = ({
  focus,
  values,
  onChange,
  onError,
  onCancel,
  onSubmit
}) => {
  const [showRepeatField, setShowRepeatField] = useState<boolean>(
    shouldShowRepeatField(values || {})
  );

  const [showWeekdaysField, setShowWeekdaysField] = useState<boolean>(
    shouldShowWeekdaysField(values || {})
  );

  const [showRepeatEndField, setShowRepeatEndField] = useState<boolean>(
    shouldShowRepeatEndField(values || {})
  );

  return (
    <Form
      focus={focus}
      values={values}
      fields={[
        { type: "toggle", name: "isTodo", label: "Todo" },
        { type: "text", name: "title", label: "Title", placeholder: "Event title ..." },
        { type: "date", name: "date", label: "Date" },
        {
          type: "select",
          name: "repeat",
          label: "Repeat",
          options: Object.entries(RepeatOption).map(([label, value]) => ({ label, value })),
          active: showRepeatField
        },
        {
          type: "choice",
          name: "weekdays",
          label: "Weekdays",
          options: Object.entries(Weekday).map(([label, value]) => ({ label, value })),
          active: showWeekdaysField
        },
        { type: "date", name: "endDate", label: "Repeat ends", active: showRepeatEndField },
        { type: "textarea", name: "notes", label: "Notes", placeholder: "Enter some notes ..." }
      ]}
      validators={{
        title: yupFormFieldValidator(yup.string().required()),
        date: yupFormFieldValidator(
          yup.string().test(
            "invalid-date",
            ({ value }) => getDateStringError(value || "", { optional: true }),
            (value) => !getDateStringError(value || "", { optional: true })
          )
        ),
        weekdays: yupFormFieldValidator(yup.string().required()),
        endDate: yupFormFieldValidator(
          yup.string().test(
            "invalid-date",
            ({ value }) => getDateStringError(value || "", { optional: true }),
            (value) => !getDateStringError(value || "", { optional: true })
          )
        )
      }}
      onChange={(values) => {
        setShowRepeatField(shouldShowRepeatField(values));
        setShowWeekdaysField(shouldShowWeekdaysField(values));
        setShowRepeatEndField(shouldShowRepeatEndField(values));

        if (onChange) {
          onChange(values as AgendaItemFormValues);
        }
      }}
      onError={(errors, values) => {
        if (onError) {
          onError(errors, values as AgendaItemFormValues);
        }
      }}
      onCancel={(values) => {
        if (onCancel) {
          onCancel(values as AgendaItemFormValues);
        }
      }}
      onSubmit={(values) => {
        if (onSubmit) {
          onSubmit(values as AgendaItemFormValues);
        }
      }}
    />
  );
};
