import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get the model ID using your job ID
const getModelId = async () => {
  const job = await openai.fineTuning.jobs.retrieve('ftjob-2ZpwQR9ja9cmLW9KoVcDEWKA');
  console.log('Your fine-tuned model ID:', job.fine_tuned_model);
};

getModelId();