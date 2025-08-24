// backend/middleware/aiMiddleware.js
const { callHuggingFaceAPI } = require('../config/ai');

// ------------------------ English stopwords only ------------------------
const EN_STOP = new Set([
  'a','an','the','and','or','but','of','in','to','for','with','on','at','by',
  'is','are','was','were','be','been','being','this','that','these','those',
  'from','as','it','its','into','about','over','under','than','then','so',
  'such','very','can','could','should','would','will','just','not','no','yes',
  'you','your','yours','our','ours'
]);

// Detect Bengali script (used to disable BN tagging per request)
const isBengali = (text) => /\p{Script=Bengali}/u.test(text);

// ------------------------ Embedding models ------------------------
const PRIMARY_MODEL = 'sentence-transformers/multi-qa-MiniLM-L6-cos-v1';
const FALLBACK_MODEL = 'intfloat/multilingual-e5-large';

/* ================= TAG SUGGESTION (EN only; BN disabled) ================= */
const suggestTags = async (req, res, next) => {
  try {
    const { title, body } = req.body;
    if (!title && !body) {
      return res.status(400).json({ message: 'Title or body is required for tag suggestion' });
    }
    const content = `${title || ''} ${body || ''}`.trim();

    // If content is Bengali, **do not** generate tags (per request).
    if (isBengali(content)) {
      req.suggestedTags = [];
      return next();
    }

    // For English (or non-Bengali) text, use simple keywording.
    req.suggestedTags = generateKeywordsEN(content).slice(0, 5);
    next();
  } catch {
    req.suggestedTags = [];
    next();
  }
};

const generateKeywordsEN = (content) => {
  // Unicode-aware tokenization, but we filter only with EN stopwords
  const tokens = (content.match(/\p{L}+/gu) || []).map(t => t.toLowerCase());

  const filtered = tokens.filter(t => !EN_STOP.has(t) && t.length > 2);

  // Score unigrams + boosted bigrams
  const freq = {};
  for (let i = 0; i < filtered.length; i++) {
    const w = filtered[i];
    freq[w] = (freq[w] || 0) + 1;
  }
  for (let i = 0; i < filtered.length - 1; i++) {
    const bg = `${filtered[i]} ${filtered[i + 1]}`;
    // (No BN stopwords; we only care about EN here)
    freq[bg] = (freq[bg] || 0) + 2;
  }
  return Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 8);
};

/* ================= EMBEDDINGS (for Related Insights) ================= */
const generateEmbedding = async (req, res, next) => {
  try {
    const { title, body } = req.body;
    if (!title && !body) {
      return res.status(400).json({ message: 'Title or body is required for embedding' });
    }
    const content = `${title || ''} ${body || ''}`.trim();

    let result;
    try {
      result = await callHuggingFaceAPI(
        PRIMARY_MODEL,
        { inputs: content, options: { wait_for_model: true } },
        'feature-extraction'
      );
    } catch {
      result = await callHuggingFaceAPI(
        FALLBACK_MODEL,
        { inputs: content, options: { wait_for_model: true } },
        'feature-extraction'
      );
    }

    req.embedding =
      Array.isArray(result) && result.length > 0 && Array.isArray(result[0])
        ? result[0]
        : [];
    next();
  } catch {
    req.embedding = [];
    next();
  }
};

module.exports = {
  suggestTags,
  generateEmbedding,
};