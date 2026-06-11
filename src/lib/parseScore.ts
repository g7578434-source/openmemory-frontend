export interface NoteScores {
  traffic: number
  cpc: number
  repeat: number
  share: number
  build: number
  total: number
}

export function parseScoresFromContent(content: string): NoteScores {
  const scores: NoteScores = {
    traffic: 0, cpc: 0, repeat: 0, share: 0, build: 0, total: 0
  }

  const lines = content.split('\n')

  for (const line of lines) {
    const match = line.match(/\|\s*\*{0,2}([\w\s\/\(\)]+?)\*{0,2}\s*\|\s*\*{0,2}(\d+)\/(?:10|50)\*{0,2}/)
    if (!match) continue

    const label = match[1].toLowerCase().trim()
    const val = parseInt(match[2], 10)

    if (label.includes('traffic'))                        scores.traffic = val
    else if (label.includes('cpc'))                       scores.cpc = val
    else if (label.includes('repeat'))                    scores.repeat = val
    else if (label.includes('share') || label.includes('viral')) scores.share = val
    else if (label.includes('build') || label.includes('speed')) scores.build = val
    else if (label.includes('total'))                     scores.total = val
  }

  if (scores.total === 0) {
    scores.total = scores.traffic + scores.cpc + scores.repeat + scores.share + scores.build
  }

  return scores
}
