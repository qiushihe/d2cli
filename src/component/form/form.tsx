import React, { useCallback, useEffect, useMemo, useState } from "react";
import chalk from "chalk";
import { Box, Key, Spacer, Text, useInput } from "ink";

import { ChoiceInput } from "~src/component/choice-input";
import { DateInput } from "~src/component/date-input";
import { SelectInput } from "~src/component/select-input";
import { TextInput } from "~src/component/text-input";

import { FormProps } from "./form.types";
import { FormInputProps } from "./form.types";

export const Form: React.FC<FormProps> = ({
  focus,
  fields,
  values,
  validators,
  onChange,
  onError,
  onSubmit,
  onCancel
}) => {
  const formControlNames = useMemo(
    () => [...fields.map((field) => field.name), "btn-submit", "btn-cancel"],
    [fields]
  );

  const [fieldsTouched, setFieldsTouched] = useState<Record<string, boolean>>({});
  const [fieldsValues, setFieldsValues] = useState<Record<string, string>>(values || {});
  const [focusedFieldName, setFocusedFieldName] = useState<string>(formControlNames[0]);

  const fieldActive = useMemo(
    () =>
      fields.reduce((acc, field) => {
        let isActive = true;
        if (field.active !== null && field.active !== undefined) {
          isActive = field.active;
        }

        return {
          ...acc,
          [field.name]: isActive
        };
      }, {} as Record<string, boolean>),
    [fields]
  );

  const normalizedFieldValues = useMemo(
    () =>
      fields.reduce(
        (acc, field) =>
          fieldActive[field.name]
            ? {
                ...acc,
                [field.name]: `${(acc || {})[field.name] || ""}`.trim()
              }
            : acc,
        fieldsValues
      ),
    [fields, fieldsValues, fieldActive]
  );

  useEffect(() => {
    if (onChange) {
      onChange(normalizedFieldValues);
    }
  }, [onChange, normalizedFieldValues]);

  const fieldsErrors = useMemo(
    () =>
      Object.entries(validators || {})
        .filter(([name]) => fieldActive[name])
        .reduce(
          (acc, [name, validate]) => ({
            ...acc,
            [name]: validate
              ? validate(normalizedFieldValues[name], normalizedFieldValues) || {}
              : {}
          }),
          {} as Record<string, Record<string, string[]>>
        ),
    [normalizedFieldValues, fieldActive, validators]
  );

  const touchAllFields = useCallback(() => {
    let fieldTouchedChanged = false;
    const _fieldTouched = { ...fieldsTouched };

    fields.forEach((field) => {
      if (fieldActive[field.name] && !_fieldTouched[field.name]) {
        _fieldTouched[field.name] = true;
        fieldTouchedChanged = true;
      }
    });

    if (fieldTouchedChanged) {
      setFieldsTouched(_fieldTouched);
    }
  }, [fields, fieldActive, fieldsTouched]);

  const handleSubmit = useCallback(() => {
    if (
      Object.values(fieldsErrors)
        .map((errObj) => Object.keys(errObj).length)
        .reduce((acc, count) => acc + count, 0) > 0
    ) {
      touchAllFields();
      if (onError) {
        onError(fieldsErrors, normalizedFieldValues);
      }
    } else {
      onSubmit(normalizedFieldValues);
    }
  }, [onSubmit, normalizedFieldValues, fieldsErrors, touchAllFields, onError]);

  const handleCancel = useCallback(() => {
    onCancel(normalizedFieldValues);
  }, [onCancel, normalizedFieldValues]);

  const handleInput = useCallback(
    (input: string, key: Key): void => {
      if (key.return) {
        if (focusedFieldName === "btn-submit") {
          handleSubmit();
          return;
        }

        if (focusedFieldName === "btn-cancel") {
          handleCancel();
          return;
        }
      }

      if (key.tab) {
        const curIndex = formControlNames.indexOf(focusedFieldName);

        let newIndex = curIndex;
        while (true) {
          newIndex = key.shift
            ? newIndex === 1
              ? 0
              : newIndex - 1
            : newIndex === formControlNames.length - 1
            ? 0
            : newIndex + 1;

          if (newIndex === curIndex) {
            break;
          } else {
            const newControlName = formControlNames[newIndex];
            if (newControlName !== "btn-submit" && newControlName !== "btn-cancel") {
              if (fieldActive[newControlName]) {
                break;
              }
            } else {
              break;
            }
          }
        }

        setFocusedFieldName(formControlNames[newIndex]);
      }
    },
    [formControlNames, focusedFieldName, handleSubmit, handleCancel, fieldActive]
  );

  useInput(handleInput, { isActive: focus });

  const maxLabelLength = useMemo(
    () => fields.reduce((acc, field) => (field.label.length > acc ? field.label.length : acc), 0),
    [fields]
  );

  return (
    <Box flexDirection="column">
      <Box flexDirection="column">
        {fields
          .filter((field) => fieldActive[field.name])
          .map((field, index) => (
            <Box alignItems="flex-start" flexGrow={1} key={`field:${index}-${field.name}`}>
              <Text>{field.label.padStart(maxLabelLength, " ")}</Text>
              <Text>{focusedFieldName === field.name ? " 》" : " 〉"}</Text>
              <Box flexDirection="column" alignItems="flex-start">
                {(() => {
                  const formInputProps: FormInputProps = {
                    focus: field.name === focusedFieldName,
                    value: fieldsValues[field.name] || "",
                    onChange: (newValue: string) => {
                      setFieldsValues({
                        ...fieldsValues,
                        [field.name]: newValue
                      });

                      if (!fieldsTouched[field.name]) {
                        setFieldsTouched({ ...fieldsTouched, [field.name]: true });
                      }
                    }
                  };

                  if (field.type === "text") {
                    return (
                      <TextInput
                        {...formInputProps}
                        multiline={false}
                        placeholder={field.placeholder}
                      />
                    );
                  } else if (field.type === "textarea") {
                    return (
                      <TextInput
                        {...formInputProps}
                        multiline={true}
                        placeholder={field.placeholder}
                      />
                    );
                  } else if (field.type === "date") {
                    return <DateInput {...formInputProps} />;
                  } else if (field.type === "select") {
                    return <SelectInput {...formInputProps} options={field.options || []} />;
                  } else if (field.type === "choice") {
                    return <ChoiceInput {...formInputProps} options={field.options || []} />;
                  } else {
                    return <Text>Unknown field type: {(field as any).type}</Text>;
                  }
                })()}
                {(() => {
                  const fieldTouched = fieldsTouched[field.name];
                  const fieldErrors = fieldsErrors[field.name] || {};

                  if (fieldTouched && Object.keys(fieldErrors).length > 0) {
                    return Object.values(fieldErrors)
                      .flat()
                      .map((errorMessage, index) => (
                        <Text key={index}>{chalk.red(`↳ ${errorMessage}`)}</Text>
                      ));
                  }
                })()}
              </Box>
            </Box>
          ))}
      </Box>
      <Box flexDirection="row">
        <Box flexDirection="row">
          <Text>{focusedFieldName === "btn-submit" ? "《 " : "〈 "}</Text>
          <Text>Submit</Text>
          <Text>{focusedFieldName === "btn-submit" ? " 》" : " 〉"}</Text>
        </Box>
        <Text>&nbsp;</Text>
        <Box flexDirection="row">
          <Text>{focusedFieldName === "btn-cancel" ? "《 " : "〈 "}</Text>
          <Text>Cancel</Text>
          <Text>{focusedFieldName === "btn-cancel" ? " 》" : " 〉"}</Text>
        </Box>
        <Spacer />
      </Box>
    </Box>
  );
};
