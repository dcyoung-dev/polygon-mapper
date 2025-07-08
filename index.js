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
let markerMode = false // Marker mode is disabled by default
const markers = [] // Array to store saved markers
let currentMarkerId = 1
let editingMarkerId = null
let markerEditMode = false

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
  } else if (markerMode) {
    // Marker mode - add a marker at the clicked location
    addMarker(e.latlng)
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
  // If drawing mode and marker mode are disabled, clicks on the map will do nothing (just navigation)
}

// Function to add a marker at the specified location
function addMarker(latlng) {
  // Create a marker with a default color
  const colorIndex = (currentMarkerId - 1) % polygonColors.length
  const color = polygonColors[colorIndex]

  // Create a custom icon with the selected color
  const markerIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color:${color};width:16px;height:16px;border-radius:50%;border:2px solid white;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  })

  // Create the Leaflet marker
  const leafletMarker = L.marker(latlng, {
    icon: markerIcon,
    draggable: false
  }).addTo(map)

  // Create a popup with the coordinates
  const popupContent = `<b>Marker ${currentMarkerId}</b><br>Lat: ${latlng.lat.toFixed(6)}<br>Lng: ${latlng.lng.toFixed(6)}`
  leafletMarker.bindPopup(popupContent)

  // Store marker data
  const markerData = {
    id: currentMarkerId++,
    name: `Marker ${currentMarkerId - 1}`,
    latlng: latlng,
    color: color,
    leafletMarker: leafletMarker
  }

  markers.push(markerData)
  updateMarkerList()

  // Show the saved markers container if it was hidden
  document.getElementById('saved-markers-container').style.display = 'block'
}

// Function to update the marker list in the sidebar
function updateMarkerList() {
  const markerList = document.getElementById('marker-list')
  markerList.innerHTML = ''

  if (markers.length === 0) {
    // Use the empty message template but customize it for markers
    const template = document.getElementById('empty-message-template')
    const clone = template.content.cloneNode(true)
    const emptyMessage = clone.querySelector('.empty-message')
    emptyMessage.textContent = 'No markers saved yet'
    emptyMessage.style.fontStyle = 'italic'
    emptyMessage.style.color = '#6c757d'
    markerList.appendChild(clone)

    // Hide export all markers button when no markers
    const exportAllBtn = document.getElementById('export-all-markers-btn')
    if (exportAllBtn) {
      exportAllBtn.style.display = 'none'
    }
    return
  }

  // Show export all markers button when markers exist
  const exportAllBtn = document.getElementById('export-all-markers-btn')
  if (exportAllBtn) {
    exportAllBtn.style.display = 'block'
  }

  markers.forEach((markerData) => {
    // Use the marker item template
    const template = document.getElementById('marker-item-template')
    const clone = template.content.cloneNode(true)

    // Get the list item and set its border color
    const listItem = clone.querySelector('.marker-item')
    listItem.style.borderLeft = `4px solid ${markerData.color}`

    // Set the marker name and coordinates info
    const nameSpan = clone.querySelector('.marker-name')
    nameSpan.textContent = markerData.name

    const coordsInfo = clone.querySelector('.marker-coordinates')
    coordsInfo.textContent = `[${markerData.latlng.lat.toFixed(6)}, ${markerData.latlng.lng.toFixed(6)}]`

    // Get the header and action buttons
    const header = clone.querySelector('.marker-header')
    const editBtn = clone.querySelector('.edit-marker-btn')
    const exportBtn = clone.querySelector('.export-marker-btn')
    const deleteBtn = clone.querySelector('.delete-marker-btn')

    // Add event listeners to the buttons
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      startEditingMarker(markerData.id)
    })

    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      exportMarker(markerData.id)
    })

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      deleteMarker(markerData.id)
    })

    // Create edit form (hidden by default)
    if (editingMarkerId === markerData.id) {
      const editForm = createMarkerEditForm(markerData)
      listItem.appendChild(editForm)
    }

    // Highlight the marker on hover
    listItem.addEventListener('mouseenter', () => {
      if (editingMarkerId !== markerData.id) {
        markerData.leafletMarker.openPopup()
      }
    })

    listItem.addEventListener('mouseleave', () => {
      if (editingMarkerId !== markerData.id) {
        markerData.leafletMarker.closePopup()
      }
    })

    // Center map on marker when clicked (only if not in edit mode)
    header.addEventListener('click', () => {
      if (editingMarkerId !== markerData.id) {
        map.setView(markerData.latlng, map.getZoom())
        markerData.leafletMarker.openPopup()
      }
    })

    markerList.appendChild(clone)
  })
}

// Function to create the edit form for a marker
function createMarkerEditForm(markerData) {
  // Use the marker edit form template
  const template = document.getElementById('marker-edit-form-template')
  const clone = template.content.cloneNode(true)

  // Get the form elements
  const nameInput = clone.querySelector('.form-group input[type="text"]')
  const colorInput = clone.querySelector('.form-group input[type="color"]')
  const cancelBtn = clone.querySelector('.cancel-marker-btn')
  const saveBtn = clone.querySelector('.save-marker-btn')

  // Set input values
  nameInput.value = markerData.name
  nameInput.id = `marker-name-${markerData.id}`

  colorInput.value = markerData.color
  colorInput.id = `marker-color-${markerData.id}`

  // Add event listeners to buttons
  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    cancelEditingMarker()
  })

  saveBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    saveMarkerEdits(markerData.id)
  })

  return clone.querySelector('.edit-form')
}

// Function to start editing a marker
function startEditingMarker(markerId) {
  // Exit if already editing this marker
  if (editingMarkerId === markerId) return

  // Cancel any ongoing editing
  if (markerEditMode) {
    cancelEditingMarker()
  }

  const markerData = markers.find(m => m.id === markerId)
  if (!markerData) return

  console.debug('Starting edit mode for marker', markerId)

  // Set editing state
  markerEditMode = true
  editingMarkerId = markerId

  // Make the marker draggable
  markerData.leafletMarker.dragging.enable()

  // Update the marker's popup to indicate edit mode
  const popupContent = `<b>${markerData.name}</b><br>Edit Mode: Drag to reposition<br>Lat: ${markerData.latlng.lat.toFixed(6)}<br>Lng: ${markerData.latlng.lng.toFixed(6)}`
  markerData.leafletMarker.setPopupContent(popupContent)
  markerData.leafletMarker.openPopup()

  // Add dragend event to update the marker's position
  markerData.leafletMarker.on('dragend', function() {
    const newPos = markerData.leafletMarker.getLatLng()
    markerData.latlng = newPos

    // Update the popup content with new coordinates
    const popupContent = `<b>${markerData.name}</b><br>Edit Mode: Drag to reposition<br>Lat: ${newPos.lat.toFixed(6)}<br>Lng: ${newPos.lng.toFixed(6)}`
    markerData.leafletMarker.setPopupContent(popupContent)

    // Update the marker list to reflect the new position
    updateMarkerList()
  })

  // Update the UI
  updateMarkerList()
}

// Function to cancel editing a marker
function cancelEditingMarker() {
  if (!markerEditMode) return

  console.debug('Canceling marker edit mode')

  const markerData = markers.find(m => m.id === editingMarkerId)
  if (markerData) {
    // Disable dragging
    markerData.leafletMarker.dragging.disable()

    // Update the popup to normal mode
    const popupContent = `<b>${markerData.name}</b><br>Lat: ${markerData.latlng.lat.toFixed(6)}<br>Lng: ${markerData.latlng.lng.toFixed(6)}`
    markerData.leafletMarker.setPopupContent(popupContent)
    markerData.leafletMarker.closePopup()
  }

  // Reset editing state
  markerEditMode = false
  editingMarkerId = null

  // Update the UI
  updateMarkerList()
}

// Function to save marker edits
function saveMarkerEdits(markerId) {
  if (!markerEditMode || editingMarkerId !== markerId) return

  console.debug('Saving edits for marker', markerId)

  const markerData = markers.find(m => m.id === markerId)
  if (!markerData) return

  // Update marker name
  const nameInput = document.getElementById(`marker-name-${markerId}`)
  if (nameInput) {
    markerData.name = nameInput.value || markerData.name
  }

  // Update marker color
  const colorInput = document.getElementById(`marker-color-${markerId}`)
  if (colorInput) {
    markerData.color = colorInput.value || markerData.color

    // Update the marker icon with the new color
    const markerIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color:${markerData.color};width:16px;height:16px;border-radius:50%;border:2px solid white;"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    })

    markerData.leafletMarker.setIcon(markerIcon)
  }

  // Disable dragging
  markerData.leafletMarker.dragging.disable()

  // Update the popup content
  const popupContent = `<b>${markerData.name}</b><br>Lat: ${markerData.latlng.lat.toFixed(6)}<br>Lng: ${markerData.latlng.lng.toFixed(6)}`
  markerData.leafletMarker.setPopupContent(popupContent)

  // Reset editing state
  markerEditMode = false
  editingMarkerId = null

  // Update the UI
  updateMarkerList()
}

// Function to delete a marker
function deleteMarker(markerId) {
  // Find the marker by ID
  const markerIndex = markers.findIndex(m => m.id === markerId)

  if (markerIndex === -1) {
    console.warn('Marker not found:', markerId)
    return
  }

  // Get the marker data
  const markerData = markers[markerIndex]

  // If we're currently editing this marker, cancel editing
  if (editingMarkerId === markerId) {
    cancelEditingMarker()
  }

  // Remove the marker from the map
  if (markerData.leafletMarker) {
    markerData.leafletMarker.remove()
  }

  // Remove the marker from the array
  markers.splice(markerIndex, 1)

  console.debug('Deleted marker:', markerId)

  // Update the UI
  updateMarkerList()

  // Hide the saved markers container if there are no markers
  if (markers.length === 0) {
    document.getElementById('saved-markers-container').style.display = 'none'
  }
}

// Function to convert marker data to GeoJSON format
function convertMarkerToGeoJSON(markerData) {
  // Create a GeoJSON feature for the marker
  const feature = {
    type: "Feature",
    properties: {
      id: markerData.id,
      name: markerData.name,
      color: markerData.color
    },
    geometry: {
      type: "Point",
      coordinates: [markerData.latlng.lng, markerData.latlng.lat]
    }
  };

  return feature;
}

// Function to export a single marker
function exportMarker(markerId) {
  const markerData = markers.find(m => m.id === markerId);
  if (!markerData) {
    console.warn('Marker not found:', markerId);
    return;
  }

  // Convert marker to GeoJSON
  const feature = convertMarkerToGeoJSON(markerData);
  const geoJSON = {
    type: "FeatureCollection",
    features: [feature]
  };

  // Create a downloadable file
  downloadJSON(geoJSON, `marker_${markerData.name.replace(/\s+/g, '_')}`);
}

// Function to export all markers
function exportAllMarkers() {
  if (markers.length === 0) {
    alert('No markers to export.');
    return;
  }

  // Convert all markers to GeoJSON
  const features = markers.map(markerData => convertMarkerToGeoJSON(markerData));
  const geoJSON = {
    type: "FeatureCollection",
    features: features
  };

  // Create a downloadable file
  downloadJSON(geoJSON, 'all_markers');
}

// Function to toggle marker mode
function toggleMarkerMode() {
  // If drawing mode is on, turn it off
  if (drawingMode) {
    toggleDrawingMode();
  }

  markerMode = !markerMode;

  // Update button text and style
  const toggleBtn = document.getElementById('marker-toggle');
  if (toggleBtn) {
    toggleBtn.textContent = `Marker Mode: ${markerMode ? 'ON' : 'OFF'}`;
    if (markerMode) {
      toggleBtn.classList.remove('inactive');
    } else {
      toggleBtn.classList.add('inactive');
    }
  }

  // Update cursor style based on marker mode
  const mapElement = document.getElementById('map');
  if (mapElement) {
    mapElement.style.cursor = markerMode ? 'crosshair' : 'grab';
  }

  // Show or hide the saved markers container based on marker mode and if there are markers
  const savedMarkersContainer = document.getElementById('saved-markers-container');
  if (savedMarkersContainer) {
    if (markerMode || markers.length > 0) {
      savedMarkersContainer.style.display = 'block';
    } else {
      savedMarkersContainer.style.display = 'none';
    }
  }

  console.debug('Marker mode:', markerMode ? 'ON' : 'OFF');
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
  const descriptionInput = clone.querySelector('.polygon-description-input')
  const cancelBtn = clone.querySelector('.cancel-btn')
  const saveBtn = clone.querySelector('.save-btn')

  // Set input values
  nameInput.value = polygonData.name
  nameInput.id = `polygon-name-${polygonData.id}`

  colorInput.value = polygonData.color
  colorInput.id = `polygon-color-${polygonData.id}`

  descriptionInput.value = polygonData.description || ''
  descriptionInput.id = `polygon-description-${polygonData.id}`

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

    // Create a number label for the polygon
    const center = savedPolygon.getBounds().getCenter()
    const numberLabel = L.divIcon({
      className: 'polygon-number-label',
      html: `<div style="background-color: white; border: 2px solid ${color}; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; color: ${color};">${currentPolygonId}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })

    const numberMarker = L.marker(center, {
      icon: numberLabel,
      interactive: false
    }).addTo(map)

    // Store polygon data
    const polygonData = {
      id: currentPolygonId++,
      name: `Polygon ${currentPolygonId - 1}`,
      description: 'No description',
      points: [...points],
      color: color,
      leafletPolygon: savedPolygon,
      numberMarker: numberMarker
    }

    // Bind popup to polygon
    savedPolygon.bindPopup(`<b>${polygonData.name}</b><br>${polygonData.description}`)

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
      color: polygonData.color,
      description: polygonData.description || ''
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

  // Remove the number marker from the map
  if (polygonData.numberMarker) {
    polygonData.numberMarker.remove()
  }

  // Remove any editing markers if they exist
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

  // Hide the number marker during editing
  if (polygonData.numberMarker) {
    polygonData.numberMarker.remove()
  }

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

    // Restore the number marker
    const center = polygonData.leafletPolygon.getBounds().getCenter()
    const numberLabel = L.divIcon({
      className: 'polygon-number-label',
      html: `<div style="background-color: white; border: 2px solid ${polygonData.color}; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; color: ${polygonData.color};">${polygonData.id}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })

    polygonData.numberMarker = L.marker(center, {
      icon: numberLabel,
      interactive: false
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

  // Update polygon description
  const descriptionInput = document.getElementById(`polygon-description-${polygonId}`)
  if (descriptionInput) {
    polygonData.description = descriptionInput.value || ''
  }

  // Remove all editing markers
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

  // Create/update the number marker with the new color and position
  const center = polygonData.leafletPolygon.getBounds().getCenter()
  const numberLabel = L.divIcon({
    className: 'polygon-number-label',
    html: `<div style="background-color: white; border: 2px solid ${polygonData.color}; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; color: ${polygonData.color};">${polygonData.id}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  })

  polygonData.numberMarker = L.marker(center, {
    icon: numberLabel,
    interactive: false
  }).addTo(map)

  // Bind popup to polygon with updated description
  polygonData.leafletPolygon.bindPopup(`<b>${polygonData.name}</b><br>${polygonData.description}`)

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

// Add map click event listener
map.on('click', onMapClick)

// Add event listener for drawing mode toggle button
document.getElementById('drawing-toggle').addEventListener('click', toggleDrawingMode)

// Add event listener for marker mode toggle button
document.getElementById('marker-toggle').addEventListener('click', toggleMarkerMode)

// Add event listener for view toggle button
document.getElementById('view-toggle').addEventListener('click', toggleMapView)

// Add event listener for save polygon button
document.getElementById('save-polygon-btn').addEventListener('click', function() {
  savePolygon(); // Call without parameters to trigger save
})

// Add event listener for export all polygons button
document.getElementById('export-all-btn').addEventListener('click', exportAllPolygons)

// Add event listener for export all markers button
document.getElementById('export-all-markers-btn').addEventListener('click', exportAllMarkers)

// GeoJSON Import Functions
function importGeoJSON() {
  const fileInput = document.getElementById('geojson-file-input')
  const file = fileInput.files[0]

  if (!file) {
    alert('Please select a GeoJSON file to import.')
    return
  }

  const reader = new FileReader()
  reader.onload = function(e) {
    try {
      const geoJSONData = JSON.parse(e.target.result)
      processGeoJSONData(geoJSONData)

      // Clear the file input
      fileInput.value = ''
    } catch (error) {
      console.error('Error parsing GeoJSON file:', error)
      alert('Error parsing GeoJSON file. Please ensure it is a valid GeoJSON format.')
    }
  }

  reader.readAsText(file)
}

function processGeoJSONData(geoJSONData) {
  let importedCount = 0
  let skippedCount = 0
  let importedMarkers = 0

  // Handle both FeatureCollection and single Feature
  const features = geoJSONData.type === 'FeatureCollection'
    ? geoJSONData.features
    : [geoJSONData]

  features.forEach((feature, index) => {
    if (feature.type !== 'Feature') {
      console.warn('Skipping non-feature item:', feature)
      skippedCount++
      return
    }

    const geometry = feature.geometry
    const properties = feature.properties || {}

    // Handle different geometry types
    switch (geometry.type) {
      case 'Polygon':
        importPolygonFromGeoJSON(geometry, properties, index)
        importedCount++
        break
      case 'MultiPolygon':
        // Import each polygon in the MultiPolygon as separate polygons
        geometry.coordinates.forEach((polygonCoords, polyIndex) => {
          const singlePolygonGeometry = {
            type: 'Polygon',
            coordinates: polygonCoords
          }
          importPolygonFromGeoJSON(singlePolygonGeometry, properties, `${index}_${polyIndex}`)
          importedCount++
        })
        break
      case 'Point':
        // Import points as markers
        importMarkerFromGeoJSON(geometry, properties, index)
        importedMarkers++
        break
      default:
        console.warn('Unsupported geometry type:', geometry.type)
        skippedCount++
        break
    }
  })

  // Show import results
  const totalImported = importedCount + importedMarkers
  if (totalImported > 0) {
    let message = ''
    if (importedCount > 0 && importedMarkers > 0) {
      message = `Successfully imported ${importedCount} polygon(s) and ${importedMarkers} marker(s).`
    } else if (importedCount > 0) {
      message = `Successfully imported ${importedCount} polygon(s).`
    } else if (importedMarkers > 0) {
      message = `Successfully imported ${importedMarkers} marker(s).`
    }

    if (skippedCount > 0) {
      message += ` Skipped ${skippedCount} unsupported features.`
    }

    alert(message)
    updatePolygonList()
    updateMarkerList()

    // Fit map to show all imported features
    const allFeatures = []
    if (polygons.length > 0) {
      allFeatures.push(...polygons.map(p => p.leafletPolygon))
    }
    if (markers.length > 0) {
      allFeatures.push(...markers.map(m => m.leafletMarker))
    }

    if (allFeatures.length > 0) {
      const group = new L.featureGroup(allFeatures)
      map.fitBounds(group.getBounds().pad(0.1))
    }
  } else {
    alert('No valid polygon or marker features found in the GeoJSON file.')
  }
}

function importPolygonFromGeoJSON(geometry, properties, index) {
  // Convert GeoJSON coordinates to Leaflet LatLng objects
  // GeoJSON uses [longitude, latitude], Leaflet uses [latitude, longitude]
  const coordinates = geometry.coordinates[0] // Get the outer ring
  const leafletPoints = coordinates.slice(0, -1).map(coord => {
    return L.latLng(coord[1], coord[0]) // Convert [lng, lat] to [lat, lng]
  })

  if (leafletPoints.length < 3) {
    console.warn('Polygon must have at least 3 points, skipping')
    return
  }

  // Determine color and name from properties or use defaults
  const color = properties.color || properties.stroke || polygonColors[(currentPolygonId - 1) % polygonColors.length]
  const name = properties.name || properties.title || `Imported Polygon ${currentPolygonId}`
  const description = properties.description || properties.desc || ''

  // Create the Leaflet polygon
  const leafletPolygon = L.polygon(leafletPoints, {
    color: color,
    weight: 3,
    opacity: 0.5,
    fillOpacity: 0.2
  }).addTo(map)

  // Store polygon data
  const polygonData = {
    id: currentPolygonId++,
    name: name,
    description: description,
    points: leafletPoints,
    color: color,
    leafletPolygon: leafletPolygon
  }

  // Bind popup to polygon
  leafletPolygon.bindPopup(`<b>${polygonData.name}</b><br>${polygonData.description}`)

  polygons.push(polygonData)

  console.debug('Imported polygon:', polygonData.name)
}

function importMarkerFromGeoJSON(geometry, properties, index) {
  // GeoJSON Point coordinates are [longitude, latitude]
  const coords = geometry.coordinates
  const latlng = L.latLng(coords[1], coords[0])

  // Determine color and name from properties or use defaults
  const color = properties.color || polygonColors[(currentMarkerId - 1) % polygonColors.length]
  const name = properties.name || `Imported Marker ${currentMarkerId}`

  // Create a custom icon with the selected color
  const markerIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color:${color};width:16px;height:16px;border-radius:50%;border:2px solid white;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  })

  // Create the Leaflet marker
  const leafletMarker = L.marker(latlng, {
    icon: markerIcon,
    draggable: false
  }).addTo(map)

  // Create a popup with the coordinates
  const popupContent = `<b>${name}</b><br>Lat: ${latlng.lat.toFixed(6)}<br>Lng: ${latlng.lng.toFixed(6)}`
  leafletMarker.bindPopup(popupContent)

  // Store marker data
  const markerData = {
    id: currentMarkerId++,
    name: name,
    latlng: latlng,
    color: color,
    leafletMarker: leafletMarker
  }

  markers.push(markerData)

  // Show the saved markers container if it was hidden
  if (markers.length > 0) {
    document.getElementById('saved-markers-container').style.display = 'block'
  }

  console.debug('Imported marker:', name)
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
  // GeoJSON import button
  const importBtn = document.getElementById('import-geojson-btn')
  if (importBtn) {
    importBtn.addEventListener('click', importGeoJSON)
  }

  // File input change event (optional - for immediate import when file is selected)
  const fileInput = document.getElementById('geojson-file-input')
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      if (this.files[0]) {
        // Auto-import when file is selected (optional)
        // importGeoJSON()
      }
    })
  }

  // ...existing event listeners...
})
