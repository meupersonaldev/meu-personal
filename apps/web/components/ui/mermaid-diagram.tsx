'use client'

import React, { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'inherit'
})

interface MermaidDiagramProps {
    chart: string
}

export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
    const ref = useRef<HTMLDivElement>(null)
    const [svg, setSvg] = useState<string>('')

    return (
        <div
            ref={ref}
            className="mermaid-diagram my-8 flex justify-center bg-white p-4 rounded-lg shadow-sm border border-gray-100 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    )
}
