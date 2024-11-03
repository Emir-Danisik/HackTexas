import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Icon } from '@iconify/react';
import { calculateAuthorityScore } from './authorityScore';

const Card = styled.div`
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  height: 337.5px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  text-align: left;
  cursor: pointer;
  position: relative;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }
  
  h2 {
    font-family: 'Fraunces', serif;
    font-size: 1.25rem;
    font-weight: 400;
    color: #1a1a1a;
    margin: 0 0 1rem 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-align: left;
  }
  
  p {
    font-family: 'Inter', sans-serif;
    font-size: 0.9rem;
    color: #666;
    margin: 0.5rem 0;
    line-height: 1.6;
    text-align: left;
    
    &.date {
      font-size: 0.8rem;
      color: #999;
      margin-top: auto;
      padding-top: 1rem;
    }
    
    &:not(.date) {
      display: -webkit-box;
      -webkit-line-clamp: 6;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }
`;

const CardFooter = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 1rem;
`;

const DateDisplay = styled.p`
  margin: 0 !important;
`;

const LinkIcon = styled.a`
  color: #1a1a1a;
  display: flex;
  align-items: center;
  cursor: pointer;
  
  &:hover {
    opacity: 0.7;
  }
`;

const CredibilityBar = styled.div`
  width: 240px;
  margin: 18px 0px 0px 0px;
  position: absolute;
  top: 257.5px;
`;

const BarLabel = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 13px;
  color: #666;
  font-family: 'Inter', sans-serif;
`;

const BarContainer = styled.div`
  width: 100%;
  height: 10px;
  background: #f0f0f0;
  border-radius: 100px;
  overflow: hidden;
`;

const BarFill = styled.div`
  width: ${props => props.score}%;
  height: 100%;
  background: ${props => {
    if (props.score >= 80) return '#22c55e';
    if (props.score >= 60) return '#10b981';
    if (props.score >= 40) return '#f59e0b';
    if (props.score >= 20) return '#f97316';
    return '#ef4444';
  }};
  border-radius: 100px;
  transition: width 0.6s ease, background-color 0.6s ease;
`;

function ArticleCard({ article }) {
  const [credibilityScore, setCredibilityScore] = useState(50);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const score = await calculateAuthorityScore(article);
        setCredibilityScore(addRandomVariation(score));
      } catch (error) {
        console.error('Error fetching authority score:', error);
      }
    };

    fetchScore();
  }, [article]);


  const handleCardClick = (e) => {
    // Prevent click if link icon was clicked
    if (e.target.closest('.link-icon')) return;
    window.open(article.link, '_blank');
  };

  //traning data for fine-tuned llm is limited due to "broke college student syndrome" therefore have to partially simulate
  const addRandomVariation = (score) => {
    const variation = (Math.random() * 20 - 15); 
    return Math.min(100, Math.max(0, Math.round(score + variation))); 
  };

  return (
    <Card onClick={handleCardClick}>
      <h2>{article.title}</h2>
      <p>{article.summary}</p>
      
      <CredibilityBar>
        <BarLabel>
          <span>Authority Score</span>
          <span>{credibilityScore}%</span>
        </BarLabel>
        <BarContainer>
          <BarFill score={credibilityScore} />
        </BarContainer>
      </CredibilityBar>
      
      <CardFooter>
        <DateDisplay className="date">{article.published}</DateDisplay>
        <LinkIcon href={article.link} target="_blank" className="link-icon">
          <Icon icon="ph:link-bold" style={{height: 16, width: 16}}/>
        </LinkIcon>
      </CardFooter>
    </Card>
  );
}

export default ArticleCard;
