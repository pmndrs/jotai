import { Credits } from '../components'

export const Footer = () => {
  return (
    <footer
      className="inline-flex lg:hidden flex-col mt-8 space-y-2"
      style={{ marginBottom: 79 }}>
      <Credits />
    </footer>
  )
}
