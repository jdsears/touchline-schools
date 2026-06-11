import Mux from '@mux/mux-node'

// Guarded client: without Mux credentials the server still boots; video
// endpoints then fail with a clear, mappable 503 instead of a crash.
function makeMuxClient() {
  if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
    return new Proxy({}, {
      get() {
        const err = new Error('Video features are not configured on this server. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET to enable them.')
        err.status = 503
        err.code = 'VIDEO_NOT_CONFIGURED'
        throw err
      },
    })
  }
  return new Mux({ tokenId: process.env.MUX_TOKEN_ID, tokenSecret: process.env.MUX_TOKEN_SECRET })
}

const mux = makeMuxClient()

export default mux
