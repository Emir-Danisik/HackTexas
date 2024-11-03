import OpenAI from 'openai';
import fs from 'fs/promises';
import FormData from 'form-data';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function uploadFile(filePath) {
  try {
    const fileContent = await fs.readFile(filePath);
    const form = new FormData();
    form.append('purpose', 'fine-tune');
    form.append('file', fileContent, {
      filename: 'training_data.jsonl',
      contentType: 'application/json',
    });

    const response = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Upload failed: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    return result.id;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

async function startFineTuning() {
  try {
    console.log('Starting fine-tuning process...');

    // Find the training data file
    const files = await fs.readdir('.');
    const jsonlFile = files.find(file => file.includes('training_data') && file.endsWith('.jsonl'));
    
    if (!jsonlFile) {
      throw new Error('No training data file found');
    }
    
    console.log(`Found training data file: ${jsonlFile}`);
    
    // Upload file
    console.log('Uploading training file...');
    const fileId = await uploadFile(jsonlFile);
    console.log('File uploaded successfully. File ID:', fileId);

    // Create fine-tuning job
    console.log('Creating fine-tuning job...');
    const fineTuningJob = await openai.fineTuning.jobs.create({
      training_file: fileId,
      model: 'gpt-4o-mini-2024-07-18',
      hyperparameters: {
        n_epochs: 3,
      },
    });
    
    console.log('Fine-tuning job created:', fineTuningJob.id);

    // Save the model information
    await fs.writeFile(
      'fine_tuned_model_info.json',
      JSON.stringify({
        completedAt: new Date().toISOString(),
        fileId: fileId,
        jobId: fineTuningJob.id,
        status: fineTuningJob.status
      }, null, 2)
    );

    return fineTuningJob;
  } catch (error) {
    console.error('Error during fine-tuning:', error);
    throw error;
  }
}

// Function to check job status
async function checkJobStatus(jobId) {
  try {
    const job = await openai.fineTuning.jobs.retrieve(jobId);
    return job.status;
  } catch (error) {
    console.error('Error checking job status:', error);
    return 'error';
  }
}

// Execute the fine-tuning process
(async () => {
  try {
    // First, let's verify the content of the JSONL file
    const files = await fs.readdir('.');
    const jsonlFile = files.find(file => file.includes('training_data') && file.endsWith('.jsonl'));
    
    if (jsonlFile) {
      const content = await fs.readFile(jsonlFile, 'utf8');
      console.log('File content preview:');
      console.log(content.slice(0, 500) + '...');
      console.log('\nTotal size:', (content.length / 1024).toFixed(2) + ' KB');
      
      // Verify JSON format
      const lines = content.trim().split('\n');
      console.log('Number of examples:', lines.length);
      
      // Parse first line to verify format
      try {
        const firstExample = JSON.parse(lines[0]);
        console.log('\nFirst example structure:', Object.keys(firstExample));
      } catch (error) {
        console.error('Error parsing JSON:', error);
      }
    }

    console.log('\nProceeding with fine-tuning...');
    const job = await startFineTuning();
    console.log('\nFine-tuning job initiated:', job.id);
    
    // Check initial status
    const status = await checkJobStatus(job.id);
    console.log('Current status:', status);
    
    console.log('\nYou can monitor the job status in the OpenAI dashboard');
    console.log('Job ID:', job.id);

  } catch (error) {
    console.error('Script failed:', error);
  }
})();