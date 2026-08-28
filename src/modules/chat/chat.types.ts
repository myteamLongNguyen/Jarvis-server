export interface ChatMessageDto {
  role: 'user' | 'assistant';
  content: string;
}

/** A tool exposed to the chat assistant. `run` is always closed over the authenticated
 * ownerId — the model can never supply or override whose data it reads. Every tool here
 * wraps an existing read-only service method; none of them can create, update, or delete
 * anything, by construction (no such tool is defined). */
export interface ChatTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  run: (input: Record<string, unknown>) => Promise<unknown>;
}
