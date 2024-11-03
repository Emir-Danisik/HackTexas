import React, { useState } from 'react';
import styled from 'styled-components';
import ArticleCard from './ArticleCard';
import { Icon } from '@iconify/react';
import { XMLParser } from 'fast-xml-parser';
import { motion, AnimatePresence } from 'framer-motion';
import SpeakingOverlay from './SpeakingOverlay';
import SearchBar from './SearchBar';
import Welcome from './Welcome';

const AppContainer = styled.div`
  text-align: left;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fafafa;
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  padding: 1rem;
  text-align: left;
`;

const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: #666;
  font-family: 'Inter', sans-serif;
  margin-top: 100px;
  
  .spin {
    font-size: 2rem;
    margin-bottom: 1rem;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  color: #e74c3c;
  padding: 1rem;
  background: #fdf0ed;
  border-radius: 8px;
  margin: 1rem;
  font-family: 'Inter', sans-serif;
`;

const AnswerSection = styled.div`
  text-align: left;
  padding: 2rem;
  margin-bottom: 0rem;
  
  h1 {
    font-family: 'Fraunces', serif;
    font-size: 2rem;
    margin-bottom: 1.75rem;
  }
  
  p {
    font-family: 'Inter', sans-serif;
    font-size: 1rem;
    color: #666;
    line-height: 1.6;
  }
`;

const CircleButton = styled.button`
  position: absolute;
  top: 2rem;
  right: 2rem;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: url(${props => props.image}) no-repeat center center;
  background-size: cover;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

const NewSessionButton = styled(CircleButton)`
  right: 5.5rem;
  background: #fcfafa;
  border: 1px solid #e0e0e0;
  
  &:hover {
    background: #ebebeb;
  }
`;

const LoadingAnswer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: #666;
  font-family: 'Inter', sans-serif;
  
  .spin {
    font-size: 1.2rem;
    animation: spin 1s linear infinite;
  }
`;

const SkeletonText = styled.div`
  width: 100%;
  height: 20px;
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin: 8px 0;

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

const SkeletonAnswer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

function App() {
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [answer, setAnswer] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasExistingResults, setHasExistingResults] = useState(false);

  const exampleQueries1 = [
      "🧬 Is aspartame bad for me?",
      "🌊 Are Europa's oceans confirmed?",
      "✨ What causes aurora borealis?",
      "🕳️ How do black holes form?",
      "🧠 Can AI become conscious?",
      "🦕 Why did dinosaurs go extinct?",
      "🦠 How do viruses mutate?",
      "🌡️ What causes climate change?",
      "🧩 How does quantum entanglement work?"
  ];

  const exampleQueries2 = [
      "💻 Can quantum computers break encryption?",
      "⚡ Is fusion energy possible?",
      "🌌 What is dark matter made of?",
      "🌍 How old is the universe?",
      "🧪 How do vaccines work?",
      "🔬 What is CRISPR gene editing?",
      "🧮 Can we solve P vs NP?",
      "🧫 How do stem cells work?",
      "🛸 Is there life on Mars?"
  ];

  const parseXMLResponse = (xmlData) => {
    const parser = new XMLParser();
    const result = parser.parse(xmlData);
    
    if (!result.feed || !result.feed.entry) {
      return [];
    }

    const entries = Array.isArray(result.feed.entry) 
      ? result.feed.entry 
      : [result.feed.entry];

    return entries.map(entry => ({
      title: entry.title,
      authors: Array.isArray(entry.author) 
        ? entry.author.map(a => a.name).join(', ')
        : entry.author.name,
      summary: entry.summary,
      link: entry.id,
      published: new Date(entry.published).toLocaleDateString(),
      doi: entry.doi || 'No DOI available'
    }));
  };

  const generateAnswer = async (articles) => {
    setIsGenerating(true);
    const summaries = articles.map(a => a.summary).join('\n\n');
    const prompt = `Based on these research paper abstracts, provide a comprehensive summary:\n\n${summaries}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", 
          messages: [
            { role: "system", content: "You are a research assistant providing well-formatted, concise summaries." },
            { role: "user", content: prompt }
          ]
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
      }
      setAnswer(data.choices[0].message.content);
    } catch (error) {
      console.error('Error generating answer:', error);
      setAnswer('Failed to generate summary. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getResearchArticles = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    if (hasExistingResults) {
      // If we have existing articles, just generate a new answer
      generateAnswer(articles);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=8`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }

      const data = await response.text();
      const parsedArticles = parseXMLResponse(data);
      setArticles(parsedArticles);
      setHasExistingResults(true);
      generateAnswer(parsedArticles);
    } catch (err) {
      setError('Failed to fetch research articles. Please try again.');
      console.error('Error fetching articles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      getResearchArticles();
    }
  };

  const handleExampleClick = (queryText) => {
    // Remove the emoji and trim
    const cleanQuery = queryText.replace(/^[^\s]+\s/, '').trim();
    setQuery(cleanQuery);
    // Trigger search immediately
    setTimeout(() => {
      getResearchArticles();
    }, 1000);
  };

  const toggleSpeaking = () => setIsSpeaking(!isSpeaking);

  const resetSession = () => {
    setArticles([]);
    setAnswer('');
    setQuery('');
    setHasExistingResults(false);
  };

  const newtonImage = 'https://applescoop.org/image/wallpapers/iphone/13243688646369157-70753860237924132.jpg';

  return (
    <AppContainer>
      <AnimatePresence>
        {isSpeaking && (
          <SpeakingOverlay 
            onClose={() => setIsSpeaking(false)}
            image={newtonImage}
          />
        )}
      </AnimatePresence>
      
      <CircleButton onClick={toggleSpeaking} image={newtonImage} />
      <NewSessionButton onClick={resetSession}>
        <Icon icon="ph:plus-bold" style={{ fontSize: '20px', color: '#1a1a1a' }} />
      </NewSessionButton>

      <Content>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {isLoading ? (
          <LoadingWrapper>
            <Icon icon="mdi:loading" className="spin" />
            <p>Searching for articles...</p>
          </LoadingWrapper>
        ) : articles.length > 0 ? (
          <>
            <AnswerSection>
              <h1>Answer</h1>
              {isGenerating ? (
                <SkeletonAnswer>
                  <SkeletonText style={{ width: '100%' }} />
                  <SkeletonText style={{ width: '92%' }} />
                  <SkeletonText style={{ width: '96%' }} />
                  <SkeletonText style={{ width: '88%' }} />
                </SkeletonAnswer>
              ) : (
                <p>{answer}</p>
              )}
            </AnswerSection>
            <Grid>
              {articles.map((article, index) => (
                <ArticleCard key={index} article={article} />
              ))}
            </Grid>
          </>
        ) : (
          <Welcome 
            exampleQueries1={exampleQueries1}
            exampleQueries2={exampleQueries2}
            handleExampleClick={handleExampleClick}
          />
        )}
      </Content>
      
      <SearchBar
        query={query}
        setQuery={setQuery}
        handleSearch={getResearchArticles}
        isLoading={isLoading}
      />
    </AppContainer>
  );
}

export default App;
