const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'

export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'

type ResponseInput = Array<{
  role: 'user' | 'system' | 'developer' | 'assistant'
  content: Array<{ type: 'input_text'; text: string }>
}>

type JsonSchema = {
  type: string
  [key: string]: unknown
}

export class OpenAiResponsesError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'OpenAiResponsesError'
    this.status = status
  }
}

export function openAiErrorMessage(errorText: string) {
  try {
    const parsed = JSON.parse(errorText) as { error?: { message?: string; type?: string; code?: string } }
    const message = parsed.error?.message
    const code = parsed.error?.code || parsed.error?.type
    return [message, code ? `(${code})` : ''].filter(Boolean).join(' ')
  } catch {
    return errorText.slice(0, 400)
  }
}

export function extractResponseOutputText(response: unknown) {
  const direct = (response as { output_text?: unknown }).output_text
  if (typeof direct === 'string' && direct.trim()) return direct

  const output = (response as { output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }> }).output
  return output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => ['output_text', 'text'].includes(content.type ?? '') && typeof content.text === 'string')
    ?.text as string | undefined
}

export async function requestOpenAiJson<T>({
  apiKey,
  model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
  instructions,
  input,
  schemaName,
  schema,
  maxOutputTokens,
}: {
  apiKey: string
  model?: string
  instructions: string
  input: ResponseInput
  schemaName: string
  schema: JsonSchema
  maxOutputTokens?: number
}): Promise<T> {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      text: {
        format: {
          type: 'json_schema',
          name: schemaName,
          strict: true,
          schema,
        },
      },
      ...(maxOutputTokens ? { max_output_tokens: maxOutputTokens } : {}),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new OpenAiResponsesError(openAiErrorMessage(errorText), response.status)
  }

  const data = await response.json()
  const text = extractResponseOutputText(data)
  if (!text) {
    throw new OpenAiResponsesError('AI returned no text.', 502)
  }

  try {
    return JSON.parse(text) as T
  } catch {
    throw new OpenAiResponsesError('AI returned invalid JSON.', 502)
  }
}
