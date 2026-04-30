import React from 'react'

function renderInline(text: string): React.ReactNode {
  // links [text](url)
  const parts: React.ReactNode[] = []
  let rest = text
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/
  while (true) {
    const m = rest.match(linkRe)
    if (!m) break
    const idx = m.index ?? 0
    if (idx > 0) parts.push(rest.slice(0, idx))
    parts.push(
      <a key={parts.length} href={m[2]} target="_blank" rel="noreferrer" style={{ color: 'var(--muted2)' }}>
        {m[1]}
      </a>
    )
    rest = rest.slice(idx + m[0].length)
  }
  if (rest.length) parts.push(rest)

  // handle inline code, bold, italics
  function renderFormatting(str: string | React.ReactNode, key: number): React.ReactNode {
    if (typeof str !== 'string') return <React.Fragment key={key}>{str}</React.Fragment>
    // Inline code
    const codeSplit = str.split(/(`[^`]+`)/g)
    return codeSplit.map((codeSeg, codeIdx) => {
      if (codeSeg.startsWith('`') && codeSeg.endsWith('`')) {
        return (
          <code key={codeIdx} style={{ background: 'rgba(255,255,255,0.04)', padding: '0 4px', borderRadius: 3 }}>
            {codeSeg.slice(1, -1)}
          </code>
        )
      }
      // Bold (**text** or __text__)
      const boldSplit = codeSeg.split(/(\*\*[^*]+\*\*|__[^_]+__)/g)
      return boldSplit.map((boldSeg, boldIdx) => {
        if ((boldSeg.startsWith('**') && boldSeg.endsWith('**')) || (boldSeg.startsWith('__') && boldSeg.endsWith('__'))) {
          return (
            <strong key={boldIdx} style={{ fontWeight: 800 }}>{boldSeg.slice(2, -2)}</strong>
          )
        }
        // Italics (*text* or _text_)
        const italicsSplit = boldSeg.split(/(\*[^*]+\*|_[^_]+_)/g)
        return italicsSplit.map((italSeg, italIdx) => {
          if ((italSeg.startsWith('*') && italSeg.endsWith('*')) || (italSeg.startsWith('_') && italSeg.endsWith('_'))) {
            return (
              <em key={italIdx}>{italSeg.slice(1, -1)}</em>
            )
          }
          return <React.Fragment key={italIdx}>{italSeg}</React.Fragment>
        })
      })
    })
  }

  return parts.map((p, i) => renderFormatting(p, i))
}

export function Markdown({ source }: { source: string }) {
  const lines = source.split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (line === '') {
      i++
      continue
    }
    // heading
    const h = line.match(/^(#{1,3})\s+(.*)$/)
    if (h) {
      const level = h[1].length
      const content = renderInline(h[2])
      blocks.push(
        <div key={i} style={{ fontWeight: 700, margin: '6px 0', fontSize: level === 1 ? 13 : level === 2 ? 12 : 11 }}>
          {content}
        </div>
      )
      i++
      continue
    }

    // list
    if (line.startsWith('- ')) {
      const items: React.ReactNode[] = []
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(
          <li key={i} style={{ marginBottom: 4 }}>
            {renderInline(lines[i].trim().slice(2))}
          </li>
        )
        i++
      }
      blocks.push(
        <ul key={`ul-${i}`} style={{ paddingLeft: 18, margin: '6px 0' }}>
          {items}
        </ul>
      )
      continue
    }

    // paragraph (may span multiple lines)
    const paraLines = [line]
    i++
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].trim().match(/^(#{1,3})\s+/) && !lines[i].trim().startsWith('- ')) {
      paraLines.push(lines[i].trim())
      i++
    }
    blocks.push(
      <div key={`p-${i}`} style={{ margin: '6px 0', lineHeight: 1.4 }}>
        {renderInline(paraLines.join(' '))}
      </div>
    )
  }

  return <div>{blocks}</div>
}

export default Markdown
