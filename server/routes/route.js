const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET /api/route?from_lat=&from_lng=&to_lat=&to_lng=
router.get('/', async (req, res) => {
  const { from_lat, from_lng, to_lat, to_lng } = req.query;

  if (!from_lat || !from_lng || !to_lat || !to_lng) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  try {
    // We use the public OSRM demo server for standard driving routes
    // For a production app, you might host your own OSRM instance.
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${from_lng},${from_lat};${to_lng},${to_lat}?overview=full&geometries=geojson&steps=true`;
    
    const response = await axios.get(osrmUrl, { timeout: 8000 });
    const data = response.data;

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return res.status(404).json({ error: 'No route found' });
    }

    const route = data.routes[0];
    
    res.json({
      geometry: route.geometry,
      distance: route.distance, // in meters
      duration: route.duration, // in seconds
      steps: route.legs[0].steps
    });
  } catch (error) {
    console.error('OSRM Route Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch route from OSRM' });
  }
});

module.exports = router;
