import { useEffect } from 'react'

export const useOnClickOutside = (node, handler) => {
  useEffect(() => {
    const listener = (event) => {
      if (!node.current || node.current.contains(event.target)) return
      handler(event)
    }
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [node, handler])
}
