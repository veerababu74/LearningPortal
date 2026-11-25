/**
 * Remove real-looking API keys from generated content. Source notes and notebooks sometimes contain
 * hard-coded keys; they must never reach the published lessons (or GitHub).
 */
const PATTERNS = [
  /\bgsk_[A-Za-z0-9]{40,}/g, // Groq
  /\bsk-ant-[A-Za-z0-9_-]{32,}/g, // Anthropic
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/g, // OpenAI
  /\bAIza[0-9A-Za-z_-]{35}\b/g, // Google
  /\bghp_[A-Za-z0-9]{36}\b/g, // GitHub
  /\bgithub_pat_[A-Za-z0-9_]{40,}/g,
  /\bhf_[A-Za-z0-9]{30,}/g, // Hugging Face
  /\bAKIA[0-9A-Z]{16}\b/g, // AWS access key id
  /\btvly-[A-Za-z0-9-]{20,}/g, // Tavily
  /\blsv2_[a-z]{2}_[A-Za-z0-9_]{20,}/g, // LangSmith
  /\bxox[bpa]-[A-Za-z0-9-]{20,}/g, // Slack
]
const PLACEHOLDER = /x{6,}|X{6,}|your|YOUR|example|EXAMPLE|1234567|\.\.\./

export function redactSecrets(text) {
  let out = String(text)
  let count = 0
  for (const re of PATTERNS) {
    out = out.replace(re, (m) => {
      if (PLACEHOLDER.test(m)) return m
      count++
      return '<REDACTED_API_KEY>'
    })
  }
  return { text: out, count }
}
