import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export const calculateAuthorityScore = async (article) => {
  try {
    const response = await openai.chat.completions.create({
      model: "ft:gpt-4o-mini-2024-07-18:personal::APTBxgjM",
      messages: [
        {
          role: "system",
          content: "You are an expert at evaluating academic research quality. Analyze the research article metadata and provide a numerical authority score from 0-100."
        },
        {
          role: "user",
          content: `
            Title: ${article.title}
            Authors: ${article.authors}
            Publication Date: ${article.published}
            DOI: ${article.doi}
            Abstract: ${article.summary}
          `
        }
      ],
      temperature: 0.2,
      max_tokens: 10
    });

    const score = parseInt(response.choices[0].message.content.trim());
    return isNaN(score) ? 50 : score;

  } catch (error) {
    console.error('Error calculating authority score:', error);
    return 50; // Default score on error
  }
};