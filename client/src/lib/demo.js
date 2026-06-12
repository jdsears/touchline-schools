// Shared entry into the public live demo: asks the server for a demo
// token and boots the app as the demo Head of Sport.
export async function enterLiveDemo() {
  const res = await fetch('/api/auth/demo-login', { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'The live demo is not available right now.')
  }
  const { token } = await res.json()
  localStorage.setItem('fam_token', token)
  window.location.href = '/teacher'
}
