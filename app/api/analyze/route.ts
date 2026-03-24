import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { errorText, context } = await req.json();

  const dead = context.nodes.filter((n: any) => n.status === 'dead').map((n: any) => n.name);
  const slow = context.nodes.filter((n: any) => n.status === 'slow').map((n: any) => n.name);
  const noData = context.topics.filter((t: any) => !t.hasData).map((t: any) => t.name);
  const active = context.nodes.filter((n: any) => n.status === 'active').map((n: any) => n.name);

  const prompt = `You are a ROS robotics expert debugging assistant. Analyze this error given the live robot state.

ERROR / CODE:
${errorText}

LIVE ROS CONTEXT:
- ROS Version: ${context.rosVersion}
- Active nodes: ${active.join(', ')}
- Dead nodes: ${dead.join(', ') || 'none'}
- Slow nodes: ${slow.join(', ') || 'none'}
- Topics with no data: ${noData.join(', ') || 'none'}
- Active topics: ${context.topics.filter((t: any) => t.hasData).map((t: any) => t.name).join(', ')}

Respond in JSON only with no markdown:
{
  "what": "1-2 sentences explaining what is happening",
  "cause": "1-2 sentences explaining the root cause using the ROS context above",
  "fix": "concrete shell command or code snippet to fix it",
  "confidence": number between 0 and 100
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const clean = text.replace(/```json|```/g, '').trim();

  try {
    const result = JSON.parse(clean);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Parse error', raw: text }, { status: 500 });
  }
}
