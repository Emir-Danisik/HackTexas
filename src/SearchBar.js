import React from 'react';
import styled from 'styled-components';
import { Icon } from '@iconify/react';

const ChatBar = styled.div`
  display: flex;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1.3rem 2rem;
  padding-top: 1.35rem;
  background: transparent;
  border-top: 0px solid rgba(0, 0, 0, 0.1);
  
  input {
    flex: 1;
    padding: 1.05rem 1.6rem;
    border: 1px solid #e0e0e0;
    border-radius: 24px;
    font-size: 16.5px;
    outline: none;
    transition: border-color 0.2s ease;
    color: #1a1a1a;
    
    &:focus {
      border: 1.5px solid #bacfc4;
      outline: none;
    }
  }
  
  button {
    position: absolute;
    right: 7.5rem;
    top: 50%;
    transform: translateY(-50%);
    background: #54b881;
    color: white;
    border: none;
    padding: 0.5rem;
    border-radius: 50px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
    
    &:hover {
      background: #f0f0f0;
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
`;

const SearchBar = ({ query, setQuery, handleSearch, isLoading }) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <ChatBar>
      <input
        type="text"
        placeholder="Ask a research question..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={isLoading}
        style={{ 
          borderRadius: '50px',
          letterSpacing: '-0.1px', 
          color: '#000000',
          marginInline: '5rem' 
        }}
      />
      <button 
        onClick={handleSearch}
        disabled={isLoading || !query.trim()}
        style={{ borderRadius: '50px', width: '43px', height: '43px' }}
      >
        <Icon 
          icon={isLoading ? "mdi:loading" : "ph:paper-plane-right-fill"} 
          className={isLoading ? "spin" : ""} 
          style={{height: 16, width: 16, color: 'white'}}
        />
      </button>
    </ChatBar>
  );
};

export default SearchBar;