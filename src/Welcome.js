import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const WelcomeContainer = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  margin-top: -100px;
  
  h1 {
    font-family: 'Fraunces', serif;
    font-weight: 300;
    font-size: 3.5rem;
    margin: 0;
    color: #1a1a1a;
  }
  
  p {
    font-family: 'Inter', sans-serif;
    color: #666;
    margin: 0.5rem 0;
    
    &.subtitle {
      opacity: 0.7;
      font-size: 0.9rem;
    }
  }
`;

const ScrollingQueries = styled.div`
  width: 100%;
  overflow: hidden;
  margin-top: 1rem;
  padding: 0 2rem;
`;

const ExampleQueriesRow = styled(motion.div)`
  display: flex;
  gap: 1rem;
  margin: 0;
  padding: 0.6rem;
  width: fit-content;
  
  > div {
    white-space: nowrap;
    padding: 0.65rem 1.25rem;
    font-size: 0.9rem;
    border: 0.5px solid #1a1a1a;
    border-radius: 50px;
    font-family: 'Inter', sans-serif;
    color: #1a1a1a;
    cursor: pointer;
    transition: background-color 0.2s ease;
    
    &:hover {
      background-color: #f0f0f0;
    }
  }
`;

const Welcome = ({ exampleQueries1, exampleQueries2, handleExampleClick }) => {
  return (
    <WelcomeContainer>
      <h1 style={{marginTop: '50px', letterSpacing: '-0.15px'}}>Newton AI</h1>
      <p className="subtitle" style={{fontSize: '16px', letterSpacing: '-0.25px'}}>
        Search arXiv papers with natural language
      </p>
      
      <ScrollingQueries>
        <ExampleQueriesRow
          animate={{ x: ["0%", "-50%"] }}
          transition={{ 
            repeat: Infinity, 
            duration: 30,
            ease: "linear",
            repeatType: "loop"
          }}
        >
          {[...exampleQueries1, ...exampleQueries1].map((q, i) => (
            <div key={i} onClick={() => handleExampleClick(q)}>{q}</div>
          ))}
        </ExampleQueriesRow>
        
        <ExampleQueriesRow
          animate={{ x: ["-50%", "0%"] }}
          transition={{ 
            repeat: Infinity, 
            duration: 30,
            ease: "linear",
            repeatType: "loop"
          }}
        >
          {[...exampleQueries2, ...exampleQueries2].map((q, i) => (
            <div key={i} onClick={() => handleExampleClick(q)}>{q}</div>
          ))}
        </ExampleQueriesRow>
      </ScrollingQueries>
    </WelcomeContainer>
  );
};

export default Welcome;