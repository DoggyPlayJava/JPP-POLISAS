
const API_KEY = "AIzaSyCRqLiYJjvdRedcRhmhro6wH8fFFARxc60";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listModels() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error fetching models:', error);
  }
}

listModels();
