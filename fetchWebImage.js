const fetch = require('node-fetch');

const fetchFirstImage = async (description) => {
    const url = "https://api.dataforseo.com/v3/serp/google/images/live/advanced";
    
    const payload = JSON.stringify([{
      keyword: description,
      location_code: 2826,
      language_code: "en",
      device: "desktop",
      os: "windows",
      depth: 1
    }]);
  
    const headers = {
      'Authorization': 'Basic YXZpcm94NEBnbWFpbC5jb206NTEwNjUzYzA0ODkyNjBmYg==',
      'Content-Type': 'application/json'
    };
  
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: payload
      });
      
      const data = await response.json();
      return data.tasks[0].result[0].items[1].source_url;

      
    } catch (error) {
      console.error('Error fetching image:', error);
      return null;
    }
  };
  
//   export default fetchFirstImage;
  
(async () => {
  const imageUrl = await fetchFirstImage("laffer curve");
  console.log(imageUrl);
})();