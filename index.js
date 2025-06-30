import L from 'leaflet';

const satelliteViewUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const simpleViewUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

let isSimpleView = true // Track current view mode
let currentTileLayer = null // Store the current tile layer

const map = L.map('map').setView([57.661273, -2.746539], 17)
currentTileLayer = L.tileLayer(simpleViewUrl, {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map)

let points = []
let polygon = null
const polygons = []
const polygonColors = ['#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#F5FF33', '#33FFF5', '#FF3333', '#33FF33', '#3333FF']
let currentPolygonId = 1
let editingPolygonId = null
let editMode = false
let drawingMode = true // Drawing mode is enabled by default

function updateCurrentPointsList() {
  const pointsList = document.getElementById('current-points-list')
  pointsList.innerHTML = ''

  if (points.length === 0) {
    // Use the empty message template
    const template = document.getElementById('empty-message-template')
    const clone = template.content.cloneNode(true)
    pointsList.appendChild(clone)
    return
  }

  points.forEach((point, index) => {
    // Use the point item template
    const template = document.getElementById('point-item-template')
    const clone = template.content.cloneNode(true)

    // Set the point coordinates text
    const pointText = clone.querySelector('.point-coordinates')
    pointText.textContent = `Point ${index + 1}: [${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}]`

    // Add event listener to the delete button
    const deleteBtn = clone.querySelector('.delete-point-btn')
    deleteBtn.addEventListener('click', () => removePoint(index))

    pointsList.appendChild(clone)
  })
}

function onMapClick (e) {
  console.debug('You clicked the map at ' + e.latlng)
  console.debug('The center is ' + map.getCenter())
  console.debug('The zoom is ' + map.getZoom())

  if (editMode) {
    // In edit mode, add point to the polygon being edited
    if (drawingMode) {
      const polygonData = polygons.find(p => p.id === editingPolygonId)
      if (polygonData) {
        polygonData.points.push(e.latlng)
        updateEditingPolygon(polygonData)
      }
    }
  } else if (drawingMode) {
    // Normal mode with drawing enabled - creating a new polygon
    points.push(e.latlng)
    if (!!polygon) {
      polygon.remove()
    }

    if (points.length > 1) {
      polygon = L.polygon(points, { color: 'red' }).addTo(map)
    }

    // Update the current points list in the sidebar
    updateCurrentPointsList()
  }
  // If drawing mode is disabled, clicks on the map will do nothing (just navigation)
}

function updatePolygonList() {
  const polygonList = document.getElementById('polygon-list')
  polygonList.innerHTML = ''

  if (polygons.length === 0) {
    // Use the empty message template but customize it for polygons
    const template = document.getElementById('empty-message-template')
    const clone = template.content.cloneNode(true)
    const emptyMessage = clone.querySelector('.empty-message')
    emptyMessage.textContent = 'No polygons saved yet'
    emptyMessage.style.fontStyle = 'italic'
    emptyMessage.style.color = '#6c757d'
    polygonList.appendChild(clone)

    // Hide export all button when no polygons
    const exportAllBtn = document.getElementById('export-all-btn')
    if (exportAllBtn) {
      exportAllBtn.style.display = 'none'
    }
    return
  }

  // Show export all button when polygons exist
  const exportAllBtn = document.getElementById('export-all-btn')
  if (exportAllBtn) {
    exportAllBtn.style.display = 'block'
  }

  polygons.forEach((polygonData) => {
    // Use the polygon item template
    const template = document.getElementById('polygon-item-template')
    const clone = template.content.cloneNode(true)

    // Get the list item and set its border color
    const listItem = clone.querySelector('.polygon-item')
    listItem.style.borderLeft = `4px solid ${polygonData.color}`

    // Set the polygon name and points info
    const nameSpan = clone.querySelector('.polygon-name')
    nameSpan.textContent = polygonData.name

    const pointsInfo = clone.querySelector('small')
    pointsInfo.textContent = `${polygonData.points.length} points`

    // Get the header and action buttons
    const header = clone.querySelector('.polygon-header')
    const editBtn = clone.querySelector('.edit-btn')
    const exportBtn = clone.querySelector('.export-btn')
    const deleteBtn = clone.querySelector('.delete-btn')

    // Add event listeners to the buttons
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      startEditing(polygonData.id)
    })

    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      exportPolygon(polygonData.id)
    })

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      deletePolygon(polygonData.id)
    })

    // Create edit form (hidden by default)
    if (editingPolygonId === polygonData.id) {
      const editForm = createEditForm(polygonData)
      listItem.appendChild(editForm)
    }

    // Highlight the polygon on hover
    listItem.addEventListener('mouseenter', () => {
      if (editingPolygonId !== polygonData.id) {
        polygonData.leafletPolygon.setStyle({ weight: 4, opacity: 0.8 })
      }
    })

    listItem.addEventListener('mouseleave', () => {
      if (editingPolygonId !== polygonData.id) {
        polygonData.leafletPolygon.setStyle({ weight: 3, opacity: 0.5 })
      }
    })

    // Center map on polygon when clicked (only if not in edit mode)
    header.addEventListener('click', () => {
      if (editingPolygonId !== polygonData.id) {
        map.fitBounds(polygonData.leafletPolygon.getBounds())
      }
    })

    polygonList.appendChild(clone)
  })
}

function createEditForm(polygonData) {
  // Use the edit form template
  const template = document.getElementById('edit-form-template')
  const clone = template.content.cloneNode(true)

  // Get the form elements
  const nameInput = clone.querySelector('.form-group input[type="text"]')
  const colorInput = clone.querySelector('.form-group input[type="color"]')
  const cancelBtn = clone.querySelector('.cancel-btn')
  const saveBtn = clone.querySelector('.save-btn')

  // Set input values
  nameInput.value = polygonData.name
  nameInput.id = `polygon-name-${polygonData.id}`

  colorInput.value = polygonData.color
  colorInput.id = `polygon-color-${polygonData.id}`

  // Add event listeners to buttons
  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    cancelEditing()
  })

  saveBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    saveEdits(polygonData.id)
  })

  return clone.querySelector('.edit-form')
}

function savePolygon (e) {
  if (!polygon) {
    console.warn('No polygon to save.')
    return
  }

  // Check if called from key press event or button click
  if (!e || e.key === 's' || e.key === 'S') {
    console.debug('Saving polygon with points:', points)

    // Remove the temporary red polygon
    polygon.remove()

    // Create a new polygon with a unique color
    const colorIndex = (currentPolygonId - 1) % polygonColors.length
    const color = polygonColors[colorIndex]

    const savedPolygon = L.polygon(points, { 
      color: color, 
      weight: 3, 
      opacity: 0.5, 
      fillOpacity: 0.2 
    }).addTo(map)

    // Store polygon data
    const polygonData = {
      id: currentPolygonId++,
      name: `Polygon ${currentPolygonId - 1}`,
      points: [...points],
      color: color,
      leafletPolygon: savedPolygon
    }

    polygons.push(polygonData)
    updatePolygonList()

    // Reset for new polygon
    polygon = null
    points = []

    // Update the current points list in the sidebar (will show empty)
    updateCurrentPointsList()
  }
}

function undo(e) {
  //   if cmd + z is pressed
  if (e.ctrlKey && e.key === 'z') {
    points.pop()

    if (!!polygon) {
      polygon.remove()
    }

    if (points.length > 1) {
      polygon = L.polygon(points, { color: 'red' }).addTo(map)
    }

    // Update the current points list in the sidebar
    updateCurrentPointsList()
  }
}

// Function to remove a specific point
function removePoint(index) {
  if (index < 0 || index >= points.length) {
    console.warn('Invalid point index:', index)
    return
  }

  console.debug('Removing point at index:', index)

  // Remove the point from the array
  points.splice(index, 1)

  // Update the polygon display
  if (!!polygon) {
    polygon.remove()
  }

  if (points.length > 1) {
    polygon = L.polygon(points, { color: 'red' }).addTo(map)
  }

  // Update the current points list in the sidebar
  updateCurrentPointsList()
}

// Function to convert polygon data to GeoJSON format
function convertToGeoJSON(polygonData) {
  // Create a GeoJSON feature for the polygon
  const feature = {
    type: "Feature",
    properties: {
      id: polygonData.id,
      name: polygonData.name,
      color: polygonData.color
    },
    geometry: {
      type: "Polygon",
      coordinates: [[]]
    }
  };

  // Add coordinates to the GeoJSON feature
  // GeoJSON uses [longitude, latitude] format, while Leaflet uses [latitude, longitude]
  polygonData.points.forEach(point => {
    feature.geometry.coordinates[0].push([point.lng, point.lat]);
  });

  // Close the polygon by repeating the first point
  if (polygonData.points.length > 0) {
    const firstPoint = polygonData.points[0];
    feature.geometry.coordinates[0].push([firstPoint.lng, firstPoint.lat]);
  }

  return feature;
}

// Function to export a single polygon
function exportPolygon(polygonId) {
  const polygonData = polygons.find(p => p.id === polygonId);
  if (!polygonData) {
    console.warn('Polygon not found:', polygonId);
    return;
  }

  // Convert polygon to GeoJSON
  const feature = convertToGeoJSON(polygonData);
  const geoJSON = {
    type: "FeatureCollection",
    features: [feature]
  };

  // Create a downloadable file
  downloadJSON(geoJSON, `polygon_${polygonData.name.replace(/\s+/g, '_')}`);
}

// Function to export all polygons
function exportAllPolygons() {
  if (polygons.length === 0) {
    alert('No polygons to export.');
    return;
  }

  // Convert all polygons to GeoJSON
  const features = polygons.map(polygonData => convertToGeoJSON(polygonData));
  const geoJSON = {
    type: "FeatureCollection",
    features: features
  };

  // Create a downloadable file
  downloadJSON(geoJSON, 'all_polygons');
}

// Function to download JSON data as a file
function downloadJSON(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.geojson`;
  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// Function to delete a saved polygon
function deletePolygon(polygonId) {
  // Find the polygon by ID
  const polygonIndex = polygons.findIndex(p => p.id === polygonId)

  if (polygonIndex === -1) {
    console.warn('Polygon not found:', polygonId)
    return
  }

  // Get the polygon data
  const polygonData = polygons[polygonIndex]

  // If we're currently editing this polygon, cancel editing
  if (editingPolygonId === polygonId) {
    cancelEditing()
  }

  // Remove the polygon from the map
  if (polygonData.leafletPolygon) {
    polygonData.leafletPolygon.remove()
  }

  // Remove any markers if they exist
  if (polygonData.markers) {
    polygonData.markers.forEach(marker => marker.remove())
  }

  // Remove the polygon from the array
  polygons.splice(polygonIndex, 1)

  console.debug('Deleted polygon:', polygonId)

  // Update the UI
  updatePolygonList()
}

// Editing functions
function startEditing(polygonId) {
  // Exit if already editing this polygon
  if (editingPolygonId === polygonId) return

  // Cancel any ongoing editing
  if (editMode) {
    cancelEditing()
  }

  const polygonData = polygons.find(p => p.id === polygonId)
  if (!polygonData) return

  console.debug('Starting edit mode for polygon', polygonId)

  // Set editing state
  editMode = true
  editingPolygonId = polygonId

  // Remove the regular polygon and create an editable version
  polygonData.leafletPolygon.remove()

  // Create a new polygon with markers at each point
  updateEditingPolygon(polygonData)

  // Update the UI
  updatePolygonList()
}

function updateEditingPolygon(polygonData) {
  // Remove existing polygon if it exists
  if (polygonData.leafletPolygon) {
    polygonData.leafletPolygon.remove()
  }

  // Remove existing markers if they exist
  if (polygonData.markers) {
    polygonData.markers.forEach(marker => marker.remove())
  }

  // Create a new polygon with the current points and color
  const color = document.getElementById(`polygon-color-${polygonData.id}`)?.value || polygonData.color

  polygonData.leafletPolygon = L.polygon(polygonData.points, {
    color: color,
    weight: 3,
    opacity: 0.8,
    fillOpacity: 0.2
  }).addTo(map)

  // Add markers for each point that can be dragged
  polygonData.markers = polygonData.points.map((point, index) => {
    const marker = L.marker(point, {
      draggable: true,
      icon: L.divIcon({
        className: 'vertex-marker',
        html: `<div style="background-color:${color};width:10px;height:10px;border-radius:50%;border:2px solid white;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      })
    }).addTo(map)

    // Update point position when marker is dragged
    marker.on('dragend', function(e) {
      polygonData.points[index] = e.target.getLatLng()
      updateEditingPolygon(polygonData)
    })

    // Remove point when marker is right-clicked
    marker.on('contextmenu', function() {
      if (polygonData.points.length > 3) {
        polygonData.points.splice(index, 1)
        updateEditingPolygon(polygonData)
      } else {
        alert('A polygon must have at least 3 points')
      }
    })

    return marker
  })
}

function cancelEditing() {
  if (!editMode) return

  console.debug('Canceling edit mode')

  const polygonData = polygons.find(p => p.id === editingPolygonId)
  if (polygonData) {
    // Remove all markers
    if (polygonData.markers) {
      polygonData.markers.forEach(marker => marker.remove())
      delete polygonData.markers
    }

    // Restore the original polygon
    if (polygonData.leafletPolygon) {
      polygonData.leafletPolygon.remove()
    }

    polygonData.leafletPolygon = L.polygon(polygonData.points, {
      color: polygonData.color,
      weight: 3,
      opacity: 0.5,
      fillOpacity: 0.2
    }).addTo(map)
  }

  // Reset editing state
  editMode = false
  editingPolygonId = null

  // Update the UI
  updatePolygonList()
}

function saveEdits(polygonId) {
  if (!editMode || editingPolygonId !== polygonId) return

  console.debug('Saving edits for polygon', polygonId)

  const polygonData = polygons.find(p => p.id === polygonId)
  if (!polygonData) return

  // Update polygon name
  const nameInput = document.getElementById(`polygon-name-${polygonId}`)
  if (nameInput) {
    polygonData.name = nameInput.value || polygonData.name
  }

  // Update polygon color
  const colorInput = document.getElementById(`polygon-color-${polygonId}`)
  if (colorInput) {
    polygonData.color = colorInput.value || polygonData.color
  }

  // Remove all markers
  if (polygonData.markers) {
    polygonData.markers.forEach(marker => marker.remove())
    delete polygonData.markers
  }

  // Create the final polygon
  if (polygonData.leafletPolygon) {
    polygonData.leafletPolygon.remove()
  }

  polygonData.leafletPolygon = L.polygon(polygonData.points, {
    color: polygonData.color,
    weight: 3,
    opacity: 0.5,
    fillOpacity: 0.2
  }).addTo(map)

  // Reset editing state
  editMode = false
  editingPolygonId = null

  // Update the UI
  updatePolygonList()
}

// Add CSS for vertex markers and delete buttons
const style = document.createElement('style')
style.textContent = `
  .vertex-marker {
    cursor: move;
  }

  .delete-point-btn {
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    margin-left: 8px;
  }

  .delete-point-btn:hover {
    background-color: #bd2130;
  }
`
document.head.appendChild(style)

// Function to toggle drawing mode
function toggleDrawingMode() {
  drawingMode = !drawingMode

  // Update button text and style
  const toggleBtn = document.getElementById('drawing-toggle')
  if (toggleBtn) {
    toggleBtn.textContent = `Drawing Mode: ${drawingMode ? 'ON' : 'OFF'}`
    if (drawingMode) {
      toggleBtn.classList.remove('inactive')
    } else {
      toggleBtn.classList.add('inactive')
    }
  }

  // Update cursor style based on drawing mode
  const mapElement = document.getElementById('map')
  if (mapElement) {
    mapElement.style.cursor = drawingMode ? 'pointer' : 'grab'
  }

  console.debug('Drawing mode:', drawingMode ? 'ON' : 'OFF')
}

// Function to toggle between simple and satellite view
function toggleMapView() {
  isSimpleView = !isSimpleView

  // Remove current tile layer
  if (currentTileLayer) {
    map.removeLayer(currentTileLayer)
  }

  // Add new tile layer based on the view mode
  if (isSimpleView) {
    currentTileLayer = L.tileLayer(simpleViewUrl, {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map)
  } else {
    currentTileLayer = L.tileLayer(satelliteViewUrl, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.arcgis.com/">ArcGIS</a>'
    }).addTo(map)
  }

  // Update button text and style
  const toggleBtn = document.getElementById('view-toggle')
  if (toggleBtn) {
    toggleBtn.textContent = `View: ${isSimpleView ? 'Simple' : 'Satellite'}`
    if (!isSimpleView) {
      toggleBtn.classList.remove('inactive')
    } else {
      toggleBtn.classList.add('inactive')
    }
  }

  console.debug('Map view:', isSimpleView ? 'Simple' : 'Satellite')
}

// Initialize the polygon list and UI state
updatePolygonList()

// Initialize the current points list
updateCurrentPointsList()

// Initialize cursor style based on default drawing mode
const mapElement = document.getElementById('map')
if (mapElement) {
  mapElement.style.cursor = drawingMode ? 'pointer' : 'grab'
}

// Event listeners
window.addEventListener('keypress', savePolygon)
window.addEventListener('keypress', undo)
window.addEventListener('keydown', function(e) {
  // Cancel editing with Escape key
  if (e.key === 'Escape' && editMode) {
    cancelEditing()
  }
})

// Add event listener for drawing mode toggle button
document.getElementById('drawing-toggle').addEventListener('click', toggleDrawingMode)

// Add event listener for view toggle button
document.getElementById('view-toggle').addEventListener('click', toggleMapView)

// Add event listener for save polygon button
document.getElementById('save-polygon-btn').addEventListener('click', function() {
  savePolygon(); // Call without parameters to trigger save
})

// Add event listener for export all button
document.getElementById('export-all-btn').addEventListener('click', exportAllPolygons)

map.on('click', onMapClick)
