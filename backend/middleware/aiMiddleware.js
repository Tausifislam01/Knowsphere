const { callHuggingFaceAPI } = require('../config/ai');
const stopWords = new Set(['of', 'in', 'to', 'and', 'the', 'a', 'an', 'for', 'with', 'on', 'at', 'by', 'is', 'are']);

// Models for feature extraction
const PRIMARY_MODEL = 'sentence-transformers/multi-qa-MiniLM-L6-cos-v1';
const FALLBACK_MODEL = 'intfloat/multilingual-e5-large';

// Summarization middleware (unchanged)
const summarizeContent = async (req, res, next) => {
  try {
    const { body } = req.body;
    if (!body) {
      return res.status(400).json({ message: 'Content body is required for summarization' });
    }
    const result = await callHuggingFaceAPI('facebook/bart-large-cnn', {
      inputs: body,
      parameters: { max_length: 100, min_length: 30 },
    }, 'models');
    req.summary = Array.isArray(result) ? result[0].summary_text : result.summary_text;
    next();
  } catch (error) {
    // Silently proceed without summarization if it fails
    req.summary = '';
    next();
  }
};

// Tag suggestion middleware
const suggestTags = async (req, res, next) => {
  try {
    const { title, body } = req.body;
    if (!title && !body) {
      return res.status(400).json({ message: 'Title or body is required for tag suggestion' });
    }
    const content = `${title || ''} ${body || ''}`.trim();

    let keywords = [];
    try {
      const result = await callHuggingFaceAPI(PRIMARY_MODEL, {
        inputs: content,
        options: { wait_for_model: true },
      }, 'feature-extraction');

      if (!result || (Array.isArray(result) && result.length === 0)) {
        // Silently try fallback model
        const fallbackResult = await callHuggingFaceAPI(FALLBACK_MODEL, {
          inputs: content,
          options: { wait_for_model: true },
        }, 'feature-extraction');
        keywords = generateKeywords(content);
      } else {
        // Fallback to n-grams since feature-extraction doesn't provide token scores
        keywords = generateKeywords(content);
      }
    } catch (error) {
      // Silently fallback to n-grams
      keywords = generateKeywords(content);
    }

    req.suggestedTags = [...new Set(keywords)].slice(0, 5);
    next();
  } catch (error) {
    // Silently fallback to n-grams
    req.suggestedTags = generateKeywords(`${req.body.title || ''} ${req.body.body || ''}`);
    next();
  }
};

// Helper function to generate keywords using n-grams and frequency analysis
const generateKeywords = (content) => {
  const tokens = content.toLowerCase().split(/\W+/).filter(token => !stopWords.has(token) && token.length > 3);
  const ngrams = generateNgrams(tokens, 2);

  const frequency = {};
  ngrams.forEach(ngram => {
    frequency[ngram] = (frequency[ngram] || 0) + (ngram.split(' ').length === 1 ? 1 : 2);
  });

  return Object.keys(frequency)
    .sort((a, b) => frequency[b] - frequency[a])
    .slice(0, 5);
};

// Helper function to generate n-grams (1-2 words)
const generateNgrams = (tokens, maxN) => {
  const ngrams = [];
  for (let n = 1; n <= maxN; n++) {
    for (let i = 0; i <= tokens.length - n; i++) {
      const ngram = tokens.slice(i, i + n).join(' ');
      if (!ngram.split(' ').every(word => stopWords.has(word))) {
        ngrams.push(ngram);
      }
    }
  }
  return ngrams;
};

// Embedding generation middleware
const generateEmbedding = async (req, res, next) => {
  try {
    const { title, body } = req.body;
    if (!title && !body) {
      return res.status(400).json({ message: 'Title or body is required for embedding' });
    }
    const content = `${title || ''} ${body || ''}`.trim();
    let result;
    try {
      result = await callHuggingFaceAPI(PRIMARY_MODEL, {
        inputs: content,
        options: { wait_for_model: true },
      }, 'feature-extraction');
    } catch (error) {
      // Silently try fallback model
      result = await callHuggingFaceAPI(FALLBACK_MODEL, {
        inputs: content,
        options: { wait_for_model: true },
      }, 'feature-extraction');
    }

    if (!Array.isArray(result) || result.length === 0 || !Array.isArray(result[0])) {
      req.embedding = [];
    } else {
      req.embedding = result[0];
    }
    next();
  } catch (error) {
    // Silently set empty embedding
    req.embedding = [];
    next();
  }
};

module.exports = { summarizeContent, suggestTags, generateEmbedding };