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
      class="text-link underline hover:text-link/80 transition-colors"
      aria-label={`${text}（新しいタブで開きます）`}
    >{text}</a>
  )
}
