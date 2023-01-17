import * as yup from "yup";

import { FormFieldValidator } from "~src/component/form/form.types";
import { isLeapYear } from "~src/helper/date.helper";

export const yupFormFieldValidator =
  (schema: yup.AnySchema | null | undefined): FormFieldValidator =>
  (value) => {
    const errors: Record<string, string[]> = {};

    if (schema) {
      try {
        schema.validateSync(value);
      } catch (err) {
        const validationErr = err as yup.ValidationError;
        const errorCode = validationErr.type || "error";

        errors[errorCode] = [...(errors[errorCode] || []), ...validationErr.errors];
      }
    }

    return errors;
  };

type GetDateStringErrorOptions = {
  optional?: boolean;
};

export const getDateStringError = (
  value: string,
  options?: GetDateStringErrorOptions
): string | null => {
  if ((value || "").trim().length <= 0 && options?.optional) {
    return null;
  }

  if (!(value || "").match(/^\d\d\d\d\/\d\d\/\d\d$/)) {
    return "the value must be in format of YYYY/MM/DD";
  }

  const parts = value.split("/", 3);

  const year = parseInt((parts[0] || "").replace(/^0*/, ""));
  const month = parseInt((parts[1] || "").replace(/^0*/, ""));
  const day = parseInt((parts[2] || "").replace(/^0*/, ""));

  if (year <= 999 || year > 9999) {
    return "the year value is invalid";
  }

  if (month < 1 || month > 12) {
    return "the month value is invalid";
  }

  if (
    month === 1 ||
    month === 3 ||
    month === 5 ||
    month === 7 ||
    month === 8 ||
    month === 10 ||
    month === 12
  ) {
    if (day < 1 || day > 31) {
      return "the day value must be between 1 and 31";
    }
  } else if (month === 4 || month === 6 || month === 9 || month === 11) {
    if (day < 1 || day > 30) {
      return "the day value must be between 1 and 30";
    }
  } else if (month === 2) {
    if (isLeapYear(year)) {
      if (day < 1 || day > 29) {
        return "the day value must be between 1 and 29";
      }
    } else {
      if (day < 1 || day > 28) {
        return "the day value must be between 1 and 28";
      }
    }
  }

  return null;
};
