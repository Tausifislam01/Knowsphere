const axios = require('axios');

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || 'your-huggingface-api-key'; // Replace with your API key
const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models';

const callHuggingFaceAPI = async (model, payload) => {
    try {
        const response = await axios.post(
            `${HUGGINGFACE_API_URL}/${model}`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error(`Hugging Face API error for model ${model}:`, error.response?.data || error.message);
        throw new Error('Failed to process AI request');
    }
};

module.exports = { callHuggingFaceAPI };