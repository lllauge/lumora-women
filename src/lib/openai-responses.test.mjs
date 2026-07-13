import assert from 'node:assert/strict'
import test from 'node:test'

import {
  OpenAiResponsesError,
  extractResponseOutputText,
  openAiErrorMessage,
  requestOpenAiJson,
} from './openai-responses.ts'

test('extracts direct and nested Responses API output text', () => {
  assert.equal(extractResponseOutputText({ output_text: '{"ok":true}' }), '{"ok":true}')
  assert.equal(
    extractResponseOutputText({
      output: [
        {
          content: [
            { type: 'output_text', text: '{"nested":true}' },
          ],
        },
      ],
    }),
    '{"nested":true}',
  )
})

test('formats OpenAI JSON error payloads', () => {
  assert.equal(
    openAiErrorMessage(JSON.stringify({ error: { message: 'Bad schema', code: 'invalid_json_schema' } })),
    'Bad schema (invalid_json_schema)',
  )
})

test('requests strict structured JSON through the Responses API', async () => {
  const originalFetch = globalThis.fetch
  let requestBody = ''

  globalThis.fetch = async (_url, init) => {
    requestBody = String(init?.body ?? '')
    return new Response(JSON.stringify({ output_text: '{"title":"ok"}' }), { status: 200 })
  }

  try {
    const result = await requestOpenAiJson({
      apiKey: 'test-key',
      model: 'test-model',
      instructions: 'Return JSON.',
      schemaName: 'demo',
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['title'],
        properties: { title: { type: 'string' } },
      },
      input: [{ role: 'user', content: [{ type: 'input_text', text: 'hello' }] }],
    })

    assert.deepEqual(result, { title: 'ok' })
    const payload = JSON.parse(requestBody)
    assert.equal(payload.model, 'test-model')
    assert.equal(payload.text.format.type, 'json_schema')
    assert.equal(payload.text.format.strict, true)
    assert.equal(payload.text.format.name, 'demo')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('wraps non-2xx OpenAI responses', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(
    JSON.stringify({ error: { message: 'Nope', type: 'bad_request' } }),
    { status: 400 },
  )

  try {
    await assert.rejects(
      requestOpenAiJson({
        apiKey: 'test-key',
        instructions: 'Return JSON.',
        schemaName: 'demo',
        schema: { type: 'object', additionalProperties: false, required: [], properties: {} },
        input: [{ role: 'user', content: [{ type: 'input_text', text: 'hello' }] }],
      }),
      (error) => error instanceof OpenAiResponsesError
        && error.status === 400
        && error.message === 'Nope (bad_request)',
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
