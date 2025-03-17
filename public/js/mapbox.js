const { config } = require('dotenv');

export const displayMap = (locations) => {
  // NOTE It's not going to work because it needed a credit card to
  // create the mapbox account. I have just used copilot to create
  // these lines. The rest of this part of the course I will just watch
  // and comeback when I need a map functionality in my project.
  mapboxgl.accessToken = config.MAPBOX;
  var map = new mapboxgl.Map({
    // Container that will hold the map
    container: 'map',
    // Style of the map. it is done it the mapbox webapp
    style: 'mapbox://styles/alexander-ke/ckp4z7z3v0k1e17mz4q0z7d7b',
    scrollZoom: false,
    //center: [-118.113491, 34.111745],
    //zoom: 10,
  });

  // Create a marker for each location
  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom', // bottom of the pin is set to the location
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add popup
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  // Actually fit map to bounds
  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
