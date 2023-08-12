"use client";
import { ClipboardIcon } from "@heroicons/react/24/solid";

import {
  CheckboxGroup,
  CodeComponent,
  GenericButton,
  Loading,
  RadioButtonGroup,
  SelectField,
  SourceFolderSection,
} from "@/components";
import {
  DEFAULT_DIAGRAM_CATEGORY,
  DEFAULT_DIAGRAM_OPTION,
  DEFAULT_LLM_MODEL,
  DEFAULT_LLM_VENDOR,
  DEFAULT_SOURCE_FOLDER,
} from "@/config/formDefaults";
import useLocalStorage from "@/hooks/useLocalStorage";
import { Form, Formik, FormikHelpers } from "formik";
import { FC, useEffect, useMemo, useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";

import {
  DiagramFormProps,
  DiagramFormValues,
  validationSchema,
} from "@/types/DiagramForm.types";
import ReactMarkdown from "react-markdown";
import { createOptionChangeHandler } from "../lib/diagramFormHandlers";

const components = {
  code: CodeComponent,
};

const DiagramForm: FC<DiagramFormProps> = ({
  diagram_config: {
    diagram_categories,
    diagram_category_options,
    default_diagram_category,
  },
  llm_config: { llm_vendors, llm_vendor_options },
  source_folder_options,
}) => {
  const [fullText, setFullText] = useState<string | undefined>(undefined);

  const [storedValue, setStoredValue] = useLocalStorage(
    "formValues",
    {
      source_folder_option: DEFAULT_SOURCE_FOLDER,
      git_ignore_file_path: "",
      diagram_category: default_diagram_category || DEFAULT_DIAGRAM_CATEGORY,
      diagram_option: DEFAULT_DIAGRAM_OPTION,
      include_folder_tree: true,
      include_python_code_outline: true,
      llm_vendor_for_instructions: DEFAULT_LLM_VENDOR,
      llm_model_for_instructions: DEFAULT_LLM_MODEL,
      design_instructions: "",
    },
    ["design_instructions"],
  );

  const [loadingValuesFromStorage, setLoadingValuesFromStorage] =
    useState(true);

  useEffect(() => {
    if (storedValue) {
      setLoadingValuesFromStorage(false);
    }
  }, [storedValue]);

  if (loadingValuesFromStorage) {
    return <Loading message="Loading local storage state..." />;
  }

  const handleSubmit = async (
    values: DiagramFormValues,
    { setSubmitting, setFieldValue }: FormikHelpers<DiagramFormValues>,
  ) => {
    setSubmitting(false);
  };

  const handleNextStep = async (
    values: DiagramFormValues,
    setFieldValue: Function,
  ) => {
    const postUrl = "http://localhost:8000/generate_diagram_instructions/";
    console.log("posting values=", values);
    const response = await fetch(postUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      console.error("There was an error posting the data");
      return;
    }

    const payload = await response.json();

    if (payload) {
      setFieldValue("design_instructions", payload.payload);
    }
  };

  const handleDiagramCategoryChange = createOptionChangeHandler(
    "diagram_category",
    "diagram_option",
  );

  const handleLlmVendorChange = createOptionChangeHandler(
    "llm_vendor_for_instructions",
    "llm_model_for_instructions",
  );

  return (
    <Formik<DiagramFormValues>
      initialValues={storedValue}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ values, setFieldValue, errors, handleReset, dirty }) => {
        useEffect(() => {
          if (dirty) {
            console.log("Saving to local storage:", values);
            setStoredValue(values);
          }
        }, [values, dirty]);

        useEffect(() => {
          setFullText(values.design_instructions);
        }, [values.design_instructions]);

        useEffect(() => {
          console.log("Values changed:", values);
          // rest of the code...
        }, [values]);

        const diagram_options = useMemo(() => {
          return diagram_categories[values.diagram_category] || [];
        }, [values.diagram_category, diagram_categories]);

        const model_options = useMemo(() => {
          return llm_vendors[values.llm_vendor_for_instructions] || [];
        }, [values.llm_vendor_for_instructions, llm_vendors]);

        return (
          <Form aria-labelledby="formTitle">
            <div>
              <div className="border-b border-gray-900/10 pl-4">
                <h2 className="text-base font-semibold leading-10 text-gray-900">
                  Mermaid Diagram GPT Generator
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-4 pl-4">
                <div className="col-span-1">
                  <SourceFolderSection options={source_folder_options} />

                  <CheckboxGroup
                    options={[
                      {
                        id: "include_folder_tree",
                        label: "Include Folder Tree",
                        helpText:
                          "Whether to include the project's folder tree.",
                      },
                      {
                        id: "include_python_code_outline",
                        label: "Include Python Code Outline",
                        helpText:
                          "Whether to include a simple outline of the project's python code",
                      },
                    ]}
                  />

                  <SelectField
                    options={diagram_category_options}
                    label="Select Diagram Category"
                    name="diagram_category"
                    id="diagram_category"
                    aria-label="Select a diagram category from the list"
                    onChange={(selected_option) =>
                      handleDiagramCategoryChange(
                        selected_option,
                        diagram_categories,
                        setFieldValue,
                      )
                    }
                  />

                  <RadioButtonGroup
                    options={diagram_options}
                    name="diagram_option"
                    onChange={(optionId) => {
                      setFieldValue("diagram_option", optionId);
                    }}
                  />

                  {errors.diagram_option ? (
                    <div className="text-red-500">{errors.diagram_option}</div>
                  ) : null}

                  <SelectField
                    options={llm_vendor_options}
                    label="Select LLM Vendor for Instructions"
                    name="llm_vendor_for_instructions"
                    id="llm_vendor_for_instructions"
                    onChange={(vendor) =>
                      handleLlmVendorChange(vendor, llm_vendors, setFieldValue)
                    }
                  />
                  <RadioButtonGroup
                    options={model_options}
                    name="llm_model_for_instructions"
                    onChange={(optionId) => {
                      setFieldValue("llm_model_for_instructions", optionId);
                    }}
                  />

                  {errors.llm_model_for_instructions ? (
                    <div className="text-red-500">
                      {errors.llm_model_for_instructions}
                    </div>
                  ) : null}

                  <div className="mt-6 flex items-center justify-end gap-x-6">
                    <GenericButton
                      label="Prepare Design Instructions"
                      type="button"
                      className="bg-blue-600 px-3 py-2 text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      onClick={() => handleNextStep(values, setFieldValue)}
                    />

                    <GenericButton
                      label="Cancel"
                      type="button"
                      className="text-gray-900 pl-2 py-2"
                      onClick={handleReset}
                    />
                  </div>
                </div>
                <div className="col-span-1 pt-2">
                  {values.design_instructions ? (
                    <>
                      <label
                        htmlFor="design_instructions"
                        className="block text-sm text-gray-700 font-medium leading-6"
                      >
                        Design Instructions
                      </label>

                      <ReactMarkdown
                        components={components}
                        className="p-2 prose max-w-[700px] mt-1 text-sm max-h-[800px] overflow-y-auto border border-gray-300 bg-slate-300 text-slate-500 rounded-md"
                      >
                        {values.design_instructions}
                      </ReactMarkdown>

                      <div className="p-2">
                        <CopyToClipboard text={fullText || ""}>
                          <button
                            className="text-sm font-semibold leading-6 text-black flex items-center cursor-pointer"
                            type="button"
                            onClick={() =>
                              alert("All content copied to clipboard!")
                            }
                          >
                            <ClipboardIcon className="h-5 w-5 mr-2" />
                            Copy All Content
                          </button>
                        </CopyToClipboard>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
};

export default DiagramForm;
