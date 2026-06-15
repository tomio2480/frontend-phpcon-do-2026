type Props = {
  href: string
  text: string
}

export default function ExternalLink({ href, text }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      class="underline hover:text-text transition-colors"
    >{text}</a>
  )
}
