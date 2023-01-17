import React, { useState } from "react";
import * as yup from "yup";

import { Form } from "~src/component/form";
import { yupFormFieldValidator } from "~src/helper/validation.helper";
import { getDateStringError } from "~src/helper/validation.helper";

import { EventFormProps } from "./event-form.types";

const shouldShowWeekdaysField = (values: Record<string, string>) =>
  (values["repeat"] || "").trim() === "weekdays";

const shouldShowRepeatEndField = (values: Record<string, string>) => {
  const repeatValue = (values["repeat"] || "").trim();
  return repeatValue.length > 0 && repeatValue !== "no-repeat";
};

export const EventForm: React.FC<EventFormProps> = ({
  focus,
  values,
  onChange,
  onError,
  onCancel,
  onSubmit
}) => {
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
        { type: "text", name: "title", label: "Title", placeholder: "Event title ..." },
        { type: "date", name: "date", label: "Date" },
        {
          type: "select",
          name: "repeat",
          label: "Repeat",
          options: [
            { label: "No repeat", value: "no-repeat" },
            { label: "Daily", value: "daily" },
            { label: "Weekdays", value: "weekdays" },
            { label: "Weekly", value: "weekly" },
            { label: "Monthly", value: "monthly" },
            { label: "Annual", value: "annual" }
          ]
        },
        {
          type: "choice",
          name: "weekdays",
          label: "Weekdays",
          options: [
            { label: "Su", value: "sunday" },
            { label: "Mo", value: "monday" },
            { label: "Tu", value: "tuesday" },
            { label: "We", value: "wednesday" },
            { label: "Th", value: "thursday" },
            { label: "Fr", value: "friend" },
            { label: "Sa", value: "saturday" }
          ],
          active: showWeekdaysField
        },
        { type: "date", name: "endDate", label: "Repeat ends", active: showRepeatEndField },
        { type: "textarea", name: "notes", label: "Notes", placeholder: "Enter some notes ..." }
      ]}
      validators={{
        title: yupFormFieldValidator(yup.string().required()),
        date: yupFormFieldValidator(
          yup
            .string()
            .required()
            .test(
              "invalid-date",
              ({ value }) => getDateStringError(value || ""),
              (value) => !getDateStringError(value || "")
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
        setShowWeekdaysField(shouldShowWeekdaysField(values));
        setShowRepeatEndField(shouldShowRepeatEndField(values));

        if (onChange) {
          onChange(values);
        }
      }}
      onError={onError}
      onCancel={onCancel}
      onSubmit={onSubmit}
    />
  );
};
