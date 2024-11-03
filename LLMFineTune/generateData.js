import { XMLParser } from 'fast-xml-parser';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import fs from 'fs/promises';

// Load environment variables
dotenv.config();

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  
  
  const RESEARCH_TOPICS = [
      {
        query: 'artificial intelligence',
        category: 'cs.AI',
        description: 'AI and Machine Learning'
      },
      {
        query: 'quantum computing',
        category: 'quant-ph',
        description: 'Quantum Computing and Information'
      },
      {
        query: 'climate change',
        category: 'physics.ao-ph',
        description: 'Climate Science and Atmospheric Physics'
      },
      {
        query: 'neuroscience',
        category: 'q-bio.NC',
        description: 'Neuroscience and Neural Computing'
      },
      {
        query: 'cryptography',
        category: 'cs.CR',
        description: 'Cryptography and Security'
      },
      {
        query: 'genomics',
        category: 'q-bio.GN',
        description: 'Genomics and Bioinformatics'
      },
      {
        query: 'robotics',
        category: 'cs.RO',
        description: 'Robotics and Automation'
      },
      {
        query: 'network science',
        category: 'cs.NI',
        description: 'Computer Networks and Internet Architecture'
      },
      {
        query: 'renewable energy',
        category: 'physics.app-ph',
        description: 'Renewable Energy and Applied Physics'
      },
      {
        query: 'drug discovery',
        category: 'q-bio.BM',
        description: 'Biomolecular Science and Drug Development'
      }
    ];
    
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    const fetchArxivArticles = async (topic, maxResults = 10) => {
      try {
        console.log(`Fetching ${maxResults} articles for topic: ${topic.description}`);
        
        const response = await fetch(
          `https://export.arxiv.org/api/query?` + 
          `search_query=cat:${encodeURIComponent(topic.category)}+` +
          `AND+all:${encodeURIComponent(topic.query)}` +
          `&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`
        );
    
        if (!response.ok) {
          throw new Error(`Failed to fetch articles for ${topic.description}`);
        }
    
        const data = await response.text();
        const parser = new XMLParser();
        const result = parser.parse(data);
        
        if (!result.feed || !result.feed.entry) {
          console.warn(`No articles found for ${topic.description}`);
          return [];
        }
    
        const entries = Array.isArray(result.feed.entry) 
          ? result.feed.entry 
          : [result.feed.entry];
    
        const articles = entries.map(entry => ({
          title: entry.title,
          authors: Array.isArray(entry.author) 
            ? entry.author.map(a => a.name).join(', ')
            : entry.author.name,
          summary: entry.summary,
          published: new Date(entry.published).toISOString().split('T')[0],
          doi: entry.doi || 'No DOI available',
          link: entry.id,
          category: topic.category,
          topic: topic.description
        }));
    
        console.log(`Successfully fetched ${articles.length} articles for ${topic.description}`);
        return articles;
    
      } catch (error) {
        console.error(`Error fetching articles for ${topic.description}:`, error);
        return [];
      }
    };



    const getAuthorityScore = async (article) => {
    try {
        // Add logging to debug API key
        if (!process.env.ANTHROPIC_API_KEY) {
        console.error('ANTHROPIC_API_KEY is not set in environment variables');
        return 50;
        }

        const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 100,
        temperature: 0.2,
        system: `You are an expert at evaluating academic research quality. 
            Analyze the given research article metadata and provide a numerical authority score from 0-100. 
            Consider:
            - Author credentials and institutional affiliations
            - Research methodology and technical depth
            - Potential impact in the field of ${article.topic}
            - Quality and clarity of the abstract
            - Publication recency
            Return only the numerical score with no additional text.`,
        messages: [{
            role: 'user',
            content: `
            Please evaluate this research article and provide only a numerical score (0-100):
            
            Title: ${article.title}
            Authors: ${article.authors}
            Publication Date: ${article.published}
            Field: ${article.topic}
            DOI: ${article.doi}
            Abstract: ${article.summary}
            `
        }]
        });

        const score = parseInt(response.content[0].text.trim());
        return isNaN(score) ? 50 : score;

    } catch (error) {
        console.error('Error getting authority score:', error);
        // Log more details about the error
        console.error('Error details:', {
        message: error.message,
        article: article.title,
        apiKey: process.env.ANTHROPIC_API_KEY ? 'Set' : 'Not set'
        });
        return 50;
    }
    };


    const generateTrainingData = async () => {
      try {
        let allArticles = [];
        
        // Fetch articles for each topic
        for (const topic of RESEARCH_TOPICS) {
          const articles = await fetchArxivArticles(topic);
          allArticles = [...allArticles, ...articles];
          // Add delay to respect arXiv API rate limits
          await delay(3000);
        }
    
        console.log(`Total articles fetched: ${allArticles.length}`);
    
        // Get authority scores with progress tracking
        const trainingData = [];
        for (let i = 0; i < allArticles.length; i++) {
          const article = allArticles[i];
          console.log(`Getting authority score for article ${i + 1}/${allArticles.length}`);
          
          const expertScore = await getAuthorityScore(article);
          trainingData.push({ article, expertScore });
          
          // Add delay to respect Claude API rate limits
          await delay(1000);
        }
    
        // Format data for fine-tuning
        const jsonlData = trainingData
          .map(item => JSON.stringify({
            messages: [
              {
                role: "system",
                content: `You are an expert at evaluating academic research quality in ${item.article.topic}. Analyze the research article metadata and provide a numerical authority score from 0-100.`
              },
              {
                role: "user",
                content: `
                  Title: ${item.article.title}
                  Authors: ${item.article.authors}
                  Publication Date: ${item.article.published}
                  Field: ${item.article.topic}
                  DOI: ${item.article.doi}
                  Abstract: ${item.article.summary}
                `
              },
              {
                role: "assistant",
                content: `${item.expertScore}`
              }
            ]
          }))
          .join('\n');
    
        // Save results to files
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const results = {
          metadata: {
            generatedAt: timestamp,
            totalArticles: trainingData.length,
            topicsCovered: RESEARCH_TOPICS.map(t => t.description),
            averageScore: trainingData.reduce((acc, curr) => acc + curr.expertScore, 0) / trainingData.length
          },
          data: trainingData
        };
    
        console.log('\nTraining Data Generation Summary:');
        console.log(`Total articles processed: ${results.metadata.totalArticles}`);
        console.log(`Average authority score: ${results.metadata.averageScore.toFixed(2)}`);
        
        return { 
          results,
          jsonlData,
          summary: results.metadata
        };
    
      } catch (error) {
        console.error('Error generating training data:', error);
        throw error;
      }
    };
    
    // Optional: Add data validation
    const validateTrainingData = (results) => {
      const validation = {
        totalArticles: results.data.length,
        articlesPerTopic: {},
        scoreDistribution: {
          low: 0,    // 0-33
          medium: 0, // 34-66
          high: 0    // 67-100
        }
      };
    
      results.data.forEach(item => {
        // Count articles per topic
        validation.articlesPerTopic[item.article.topic] = 
          (validation.articlesPerTopic[item.article.topic] || 0) + 1;
    
        // Analyze score distribution
        if (item.expertScore <= 33) validation.scoreDistribution.low++;
        else if (item.expertScore <= 66) validation.scoreDistribution.medium++;
        else validation.scoreDistribution.high++;
      });
    
      return validation;
    };





// Execute and save results
(async () => {
  try {
    console.log('Starting training data generation...');
    const { results, jsonlData, summary } = await generateTrainingData();
    
    // Save to files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await fs.writeFile(`training_data_${timestamp}.json`, JSON.stringify(results, null, 2));
    await fs.writeFile(`training_data_${timestamp}.jsonl`, jsonlData);
    
    console.log('\nFiles saved successfully!');
    console.log('Summary:', summary);
    
  } catch (error) {
    console.error('Script failed:', error);
  }
})();