const { callHuggingFaceAPI } = require('../config/ai');

// Summarization middleware
const summarizeContent = async (req, res, next) => {
    try {
        const { body } = req.body;
        if (!body) {
            return res.status(400).json({ message: 'Content body is required for summarization' });
        }
        const result = await callHuggingFaceAPI('facebook/bart-large-cnn', {
            inputs: body,
            parameters: { max_length: 100, min_length: 30 },
        });
        req.summary = Array.isArray(result) ? result[0].summary_text : result.summary_text;
        next();
    } catch (error) {
        console.error('Summarization error:', error);
        res.status(500).json({ message: 'Failed to summarize content' });
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
        const result = await callHuggingFaceAPI('distilbert-base-uncased', {
            inputs: content,
            parameters: { max_length: 50 },
        });
        // Extract keywords (simplified; DistilBERT outputs embeddings, so we mock keywords)
        const keywords = content.split(/\W+/).filter(word => word.length > 3).slice(0, 5);
        req.suggestedTags = keywords;
        next();
    } catch (error) {
        console.error('Tag suggestion error:', error);
        res.status(500).json({ message: 'Failed to suggest tags' });
    }
};

module.exports = { summarizeContent, suggestTags };