// backend/config/ai.js
// Safe HTTP client for Hugging Face (or similar) with sane timeouts & lightweight retry.
const axios = require('axios');
const { env } = require('./env');

// base axios with timeout and no secret leakage
const hf = axios.create({
  baseURL: 'https://api-inference.huggingface.co',
  timeout: 10_000, // 10s
  headers: env.HUGGINGFACE_API_KEY ? {
    Authorization: `Bearer ${env.HUGGINGFACE_API_KEY}`,
  } : {},
});

// naive exponential backoff for 429/503/timeouts up to 2 retries
hf.interceptors.response.use(
  r => r,
  async (error) => {
    const cfg = error.config || {};
    const status = error.response?.status;

    // Only retry idempotent GET/HEAD; if you use POST for inference, skip retries or gate via cfg.idempotent
    const method = (cfg.method || 'get').toLowerCase();
    const idempotent = method === 'get' || cfg.idempotent === true;

    cfg.__retryCount = cfg.__retryCount || 0;
    const shouldRetry =
      idempotent &&
      cfg.__retryCount < 2 &&
      (status === 429 || status === 503 || error.code === 'ECONNABORTED');

    if (!shouldRetry) {
      return Promise.reject(error);
    }

    cfg.__retryCount += 1;
    const delayMs = 300 * (2 ** (cfg.__retryCount - 1)); // 300ms, 600ms
    await new Promise(res => setTimeout(res, delayMs));
    return hf(cfg);
  }
);

// Helper to call an inference endpoint with graceful fallback
async function safeHfGet(url, params = {}) {
  try {
    const { data } = await hf.get(url, { params });
    return { ok: true, data };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[hf] request failed:', e.response?.status || e.code || e.message);
    return { ok: false, error: 'External AI service unavailable. Proceeding without suggestions.' };
  }
}

module.exports = { hf, safeHfGet };