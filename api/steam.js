// api/steam.js (Vercel serverless function)

const axios = require("axios");

module.exports = async (req, res) => {
  try {
    const response = await axios.get('https://api.steampowered.com/ISteamApps/GetAppList/v2');
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching data from Steam API' });
  }
};
