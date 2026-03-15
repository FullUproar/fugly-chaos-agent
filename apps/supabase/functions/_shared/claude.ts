import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.39';

let client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: Deno.env.get('CLAUDE_API_KEY')! });
  }
  return client;
}

export async function generateText(prompt: string, maxTokens = 2000): Promise<string> {
  const claude = getClaudeClient();
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type');
  return block.text;
}
