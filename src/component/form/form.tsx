import React, { useCallback, useMemo, useState } from "react";
import { Box, Key, Spacer, Text, useInput } from "ink";

import { DateInput } from "~src/component/date-input";
import { SelectInput } from "~src/component/select-input";
import { TextInput } from "~src/component/text-input";

import { FormProps } from "./form.types";
import { FormInputProps } from "./form.types";

export const Form: React.FC<FormProps> = ({ focus, fields, onSubmit, onCancel }) => {
  const formControlNames = useMemo(
    () => [...fields.map((field) => field.name), "btn-submit", "btn-cancel"],
    [fields]
  );

  const maxLabelLength = useMemo(
    () => fields.reduce((acc, field) => (field.label.length > acc ? field.label.length : acc), 0),
    [fields]
  );

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [focusedFieldName, setFocusedFieldName] = useState<string>(formControlNames[0]);

  const handleInput = useCallback(
    (input: string, key: Key): void => {
      if (key.return) {
        if (focusedFieldName === "btn-submit") {
          onSubmit(fieldValues);
          return;
        }

        if (focusedFieldName === "btn-cancel") {
          onCancel();
          return;
        }
      }

      if (key.tab) {
        let newIndex = formControlNames.indexOf(focusedFieldName);

        newIndex = key.shift
          ? newIndex === 1
            ? 0
            : newIndex - 1
          : newIndex === formControlNames.length - 1
          ? 0
          : newIndex + 1;

        setFocusedFieldName(formControlNames[newIndex]);
      }
    },
    [fieldValues, onSubmit, onCancel, formControlNames, focusedFieldName]
  );

  useInput(handleInput, { isActive: focus });

  return (
    <Box flexDirection="column">
      <Box flexDirection="column">
        {fields.map((field, index) => {
          return (
            <Box alignItems="flex-start" flexGrow={1} key={`field:${index}-${field.name}`}>
              <Text>{field.label.padStart(maxLabelLength, " ")}</Text>
              <Text>{focusedFieldName === field.name ? " 》" : " 〉"}</Text>
              {(() => {
                const formInputProps: FormInputProps = {
                  focus: field.name === focusedFieldName,
                  value: fieldValues[field.name] || "",
                  onChange: (newValue: string) => {
                    setFieldValues({
                      ...fieldValues,
                      [field.name]: newValue
                    });
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
                } else {
                  return <Text>Unknown field type: {field.type}</Text>;
                }
              })()}
            </Box>
          );
        })}
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
