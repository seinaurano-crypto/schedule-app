import type { Category, TimeEvent } from '../types'

export interface ParsedEvent {
  start: number // minutes
  end: number
  categoryId: string | null
  memo: string
}

function hmToMinutes(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim())
  if (!m) return null
  let h = Number(m[1])
  const min = Number(m[2])
  if (h === 24 && min === 0) return 1440
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + Math.round(min / 5) * 5
}

function matchCategory(name: string | null | undefined, categories: Category[]): string | null {
  if (!name) return null
  const n = name.trim().toLowerCase()
  const exact = categories.find((c) => c.name.toLowerCase() === n)
  if (exact) return exact.id
  const partial = categories.find(
    (c) => c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase()),
  )
  return partial?.id ?? null
}

const TOOL = {
  name: 'register_schedule',
  description:
    'ユーザーが自然言語で述べた1日の予定を、個別の時間ブロックに分解して登録する。各ブロックは開始時刻・終了時刻・カテゴリ・短いメモを持つ。',
  input_schema: {
    type: 'object' as const,
    properties: {
      events: {
        type: 'array',
        description: '時系列順の予定ブロックの配列',
        items: {
          type: 'object',
          properties: {
            start_time: { type: 'string', description: '開始時刻 "HH:MM" 24時間表記（5分単位）' },
            end_time: { type: 'string', description: '終了時刻 "HH:MM" 24時間表記（5分単位）' },
            category: {
              type: 'string',
              description: '与えられたカテゴリ名のいずれか。当てはまらなければ空文字。',
            },
            memo: { type: 'string', description: '内容の短いメモ（任意。例: A社打合せ）' },
          },
          required: ['start_time', 'end_time'],
        },
      },
    },
    required: ['events'],
  },
}

export async function parseSchedule(
  text: string,
  categories: Category[],
  apiKey: string,
  model: string,
): Promise<ParsedEvent[]> {
  const catNames = categories.map((c) => c.name)
  const system = [
    'あなたは日本語のスケジュール整理アシスタントです。',
    'ユーザーの文章から1日の予定を読み取り、register_schedule ツールで登録してください。',
    '時刻は24時間表記の "HH:MM"、5分単位に丸めます。「9時」→"09:00"、「10時半」→"10:30"。',
    '終了時刻が明示されない場合は、次の予定の開始時刻や文脈から自然に推定してください。',
    catNames.length > 0
      ? `カテゴリは次のいずれかに振り分けてください（最も近いものを選ぶ）: ${catNames.join(' / ')}。どれにも当てはまらなければ category は空文字にしてください。`
      : 'カテゴリは未定義です。category は空文字にしてください。',
    'メモには固有名詞など内容が分かる短い語句を入れてください（無ければ空文字）。',
  ].join('\n')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      system,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'register_schedule' },
      messages: [{ role: 'user', content: text }],
    }),
  })

  if (!res.ok) {
    let detail = ''
    try {
      const j = await res.json()
      detail = j?.error?.message ?? JSON.stringify(j)
    } catch {
      detail = await res.text()
    }
    throw new Error(`Claude API エラー (${res.status}): ${detail}`)
  }

  const data = await res.json()
  const toolUse = (data.content ?? []).find((c: any) => c.type === 'tool_use')
  const raw: any[] = toolUse?.input?.events ?? []

  const out: ParsedEvent[] = []
  for (const e of raw) {
    const start = hmToMinutes(e.start_time)
    const end = hmToMinutes(e.end_time)
    if (start == null || end == null || end <= start) continue
    out.push({
      start,
      end,
      categoryId: matchCategory(e.category, categories),
      memo: (e.memo ?? '').toString().trim(),
    })
  }
  return out
}

export type { TimeEvent }
