// Define your models here.

export interface Model {
  id: string;
  label: string;
  apiIdentifier: string;
  description: string;
}

export const models: Array<Model> = [
  {
    id: "gpt-4o-mini",
    label: "GPT 4o mini",
    apiIdentifier: "gpt-4o-mini",
    description: "Small model for fast, lightweight tasks",
  },
  {
    id: "gpt-4o",
    label: "GPT 4o",
    apiIdentifier: "gpt-4o",
    description: "For complex, multi-step tasks",
  },
  {
    id: "gemini-1.5-pro-latest",
    label: "Gemini 1.5 Pro",
    apiIdentifier: "gemini-1.5-pro-latest",
    description: "For generating code, text, and more",
  },
  {
    id: "claude-3-5-sonnet-20241022",
    label: "Claude 3.5 Sonnet",
    apiIdentifier: "claude-3-5-sonnet-20241022",
    description: "For generating poetry and creative writing",
  },
] as const;

export const DEFAULT_MODEL_NAME: string = "claude-3-5-sonnet-20241022";
