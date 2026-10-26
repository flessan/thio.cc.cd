declare module 'virtual:kerja-shortcuts' {
  type KerjaShortcut = {
    name: string
    url: string
    icon: string
    category: string
  }

  const shortcuts: KerjaShortcut[]
  export default shortcuts
}
