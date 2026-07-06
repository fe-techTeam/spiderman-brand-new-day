// The Living Web — rotating city feed + globe hubs. Ported from the mockup's
// `_cities` list and the lon/lat lookup used to place pings on the world map.

export const CITIES = [
  "Mumbai, India", "New York, USA", "London, UK", "Tokyo, Japan", "Bengaluru, India",
  "São Paulo, Brazil", "Delhi, India", "Sydney, Australia", "Toronto, Canada",
  "Berlin, Germany", "Chennai, India", "Mexico City, Mexico", "Seoul, South Korea",
  "Paris, France", "Hyderabad, India", "Lagos, Nigeria", "Dubai, UAE", "Manila, Philippines",
];

// [lon, lat] for each city above.
export const CITY_LL = {
  "Mumbai, India": [72.8, 19.1], "New York, USA": [-74, 40.7], "London, UK": [-0.1, 51.5], "Tokyo, Japan": [139.7, 35.7],
  "Bengaluru, India": [77.6, 13], "São Paulo, Brazil": [-46.6, -23.5], "Delhi, India": [77.2, 28.6], "Sydney, Australia": [151.2, -33.9],
  "Toronto, Canada": [-79.4, 43.7], "Berlin, Germany": [13.4, 52.5], "Chennai, India": [80.3, 13.1], "Mexico City, Mexico": [-99.1, 19.4],
  "Seoul, South Korea": [127, 37.5], "Paris, France": [2.3, 48.9], "Hyderabad, India": [78.5, 17.4], "Lagos, Nigeria": [3.4, 6.5],
  "Dubai, UAE": [55.3, 25.2], "Manila, Philippines": [121, 14.6],
};
