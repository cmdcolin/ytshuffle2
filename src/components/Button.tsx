export default function Button({
  children,
  ...props
}: React.ComponentProps<'button'>) {
  return <button {...props}>{children}</button>
}
