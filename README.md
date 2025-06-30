# Polygon Mapper

A web-based tool for creating, editing, and exporting polygon data on maps. Perfect for marking areas of interest, creating geospatial data, or planning projects that require geographical boundaries.

**Try it online**: [https://polymapper.braw.software/](https://polymapper.braw.software/)

## Features

- **Interactive Map Interface**: Based on Leaflet.js and OpenStreetMap
- **Polygon Creation**: Click on the map to create polygon vertices
- **Polygon Management**:
  - Save multiple polygons with custom names and colors
  - Edit existing polygons (add, move, or delete points)
  - Delete unwanted polygons
- **Data Export**: Export individual polygons or all polygons as GeoJSON
- **User-Friendly Interface**: Intuitive sidebar for managing your polygon collection

## Installation

This is a client-side web application with no server dependencies. To use it:

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/mapper.git
   cd mapper
   ```

2. Open `index.html` in your web browser:
   - You can use a local web server like Python's built-in server:
     ```
     python -m http.server
     ```
   - Or simply open the file directly in your browser

## Usage

### Creating a Polygon

1. Ensure "Drawing Mode" is enabled (it's on by default)
2. Click on the map to add points to your polygon
3. Each point will appear in the "Current Points" list
4. When finished, click "Save Polygon"
5. Enter a name for your polygon and select a color (or use the default)

### Editing a Polygon

1. Find the polygon in the sidebar list
2. Click the "Edit" button
3. Modify the polygon:
   - Click on the map to add new points
   - Drag existing points to move them
   - Right-click on a point to remove it
4. When finished, click "Save Changes"

### Exporting Data

- To export a single polygon, click the "Export" button next to the polygon name
- To export all polygons, click the "Export All" button at the top of the sidebar
- Data is exported in GeoJSON format, which can be used in most GIS applications

## Dependencies

- [Leaflet.js](https://leafletjs.com/) - JavaScript library for interactive maps
- [OpenStreetMap](https://www.openstreetmap.org/) - Map data provider

## License

This project is private and not licensed for public use.

## Contributing

This is a private project. Please contact the repository owner for contribution guidelines.
