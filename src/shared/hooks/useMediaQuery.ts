import { useEffect, useState } from 'react'

/**
 * For cases where a breakpoint has to change behaviour, not just styling —
 * SVG font sizes, which layout to render. Anything that's purely visual should
 * use Tailwind's sm:/md: prefixes instead and stay out of JavaScript.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)
    setMatches(list.matches) // in case it changed between render and effect
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}