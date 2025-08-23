const axios = require('axios');
require('dotenv').config();

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co';

const callHuggingFaceAPI = async (model, payload, task = 'models') => {
  try {
    if (!HUGGINGFACE_API_KEY) {
      throw new Error('HUGGINGFACE_API_KEY is not defined in .env file');
    }
    let endpoint = task === 'feature-extraction' ? `pipeline/feature-extraction/${model}` : `${task}/${model}`;
    console.log(`Calling Hugging Face API: ${HUGGINGFACE_API_URL}/${endpoint}`);
    const response = await axios.post(
      `${HUGGINGFACE_API_URL}/${endpoint}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`API response for ${model}:`, response.data);
    return response.data;
  } catch (error) {
    // Silently handle errors without logging
    if (error.response?.status === 429) {
      throw new Error('Rate limit reached. Please check your Hugging Face free tier quota or upgrade to PRO.');
    }
    if (error.response?.status === 404) {
      throw new Error(`Model ${model} not found on Hugging Face Inference API.`);
    }
    throw new Error(`Failed to process AI request: ${error.message}`);
  }
};

module.exports = { callHuggingFaceAPI };