var map = L.map('map').setView([57.661273, -2.746539], 17)
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map)

var points = []
var polygon = null
var polygons = []
var polygonColors = ['#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#F5FF33', '#33FFF5', '#FF3333', '#33FF33', '#3333FF']
var currentPolygonId = 1
var editingPolygonId = null
var editMode = false
var drawingMode = true // Drawing mode is enabled by default

function updateCurrentPointsList() {
  const pointsList = document.getElementById('current-points-list')
  pointsList.innerHTML = ''

  if (points.length === 0) {
    const emptyMessage = document.createElement('p')
    emptyMessage.textContent = 'No points added yet'
    emptyMessage.classList.add('empty-message')
    pointsList.appendChild(emptyMessage)
    return
  }

  points.forEach((point, index) => {
    const pointItem = document.createElement('div')
    pointItem.classList.add('point-item')

    // Create a container for the point text
    const pointTextContainer = document.createElement('div')
    pointTextContainer.style.display = 'flex'
    pointTextContainer.style.justifyContent = 'space-between'
    pointTextContainer.style.alignItems = 'center'
    pointTextContainer.style.width = '100%'

    const pointText = document.createElement('span')
    pointText.classList.add('point-coordinates')
    // Format coordinates to 6 decimal places
    pointText.textContent = `Point ${index + 1}: [${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}]`
    pointTextContainer.appendChild(pointText)

    // Create delete button
    const deleteBtn = document.createElement('button')
    deleteBtn.classList.add('delete-point-btn')
    deleteBtn.innerHTML = '&times;' // × symbol
    deleteBtn.title = 'Remove this point'
    deleteBtn.addEventListener('click', () => removePoint(index))

    pointTextContainer.appendChild(deleteBtn)
    pointItem.appendChild(pointTextContainer)
    pointsList.appendChild(pointItem)
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
    const emptyMessage = document.createElement('li')
    emptyMessage.textContent = 'No polygons saved yet'
    emptyMessage.style.fontStyle = 'italic'
    emptyMessage.style.color = '#6c757d'
    polygonList.appendChild(emptyMessage)
    return
  }

  polygons.forEach((polygonData, index) => {
    const listItem = document.createElement('li')
    listItem.style.borderLeft = `4px solid ${polygonData.color}`
    listItem.classList.add('polygon-item')

    // Create polygon header with name and actions
    const header = document.createElement('div')
    header.classList.add('polygon-header')

    const nameSpan = document.createElement('span')
    nameSpan.classList.add('polygon-name')
    nameSpan.textContent = polygonData.name
    header.appendChild(nameSpan)

    const pointsInfo = document.createElement('small')
    pointsInfo.style.color = '#6c757d'
    pointsInfo.textContent = `${polygonData.points.length} points`
    header.appendChild(pointsInfo)

    const actions = document.createElement('div')
    actions.classList.add('polygon-actions')

    const editBtn = document.createElement('button')
    editBtn.classList.add('edit-btn')
    editBtn.textContent = 'Edit'
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      startEditing(polygonData.id)
    })
    actions.appendChild(editBtn)

    const deleteBtn = document.createElement('button')
    deleteBtn.classList.add('delete-btn')
    deleteBtn.textContent = 'Delete'
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      deletePolygon(polygonData.id)
    })
    actions.appendChild(deleteBtn)

    header.appendChild(actions)
    listItem.appendChild(header)

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
    header.addEventListener('click', (e) => {
      if (editingPolygonId !== polygonData.id) {
        map.fitBounds(polygonData.leafletPolygon.getBounds())
      }
    })

    polygonList.appendChild(listItem)
  })
}

function createEditForm(polygonData) {
  const form = document.createElement('div')
  form.classList.add('edit-form')

  // Name input
  const nameGroup = document.createElement('div')
  nameGroup.classList.add('form-group')

  const nameLabel = document.createElement('label')
  nameLabel.textContent = 'Polygon Name:'
  nameGroup.appendChild(nameLabel)

  const nameInput = document.createElement('input')
  nameInput.type = 'text'
  nameInput.value = polygonData.name
  nameInput.id = `polygon-name-${polygonData.id}`
  nameGroup.appendChild(nameInput)

  form.appendChild(nameGroup)

  // Color picker
  const colorGroup = document.createElement('div')
  colorGroup.classList.add('form-group')

  const colorLabel = document.createElement('label')
  colorLabel.textContent = 'Polygon Color:'
  colorGroup.appendChild(colorLabel)

  const colorInput = document.createElement('input')
  colorInput.type = 'color'
  colorInput.value = polygonData.color
  colorInput.id = `polygon-color-${polygonData.id}`
  colorGroup.appendChild(colorInput)

  form.appendChild(colorGroup)

  // Edit instructions
  const instructions = document.createElement('div')
  instructions.classList.add('edit-instructions')
  instructions.innerHTML = `
    <p>Point Editing:</p>
    <ul>
      <li>Click on the map to add new points</li>
      <li>Drag existing points to move them</li>
      <li>Right-click on a point to remove it</li>
    </ul>
  `
  form.appendChild(instructions)

  // Action buttons
  const actions = document.createElement('div')
  actions.classList.add('polygon-actions')
  actions.style.justifyContent = 'flex-end'
  actions.style.marginTop = '10px'

  const cancelBtn = document.createElement('button')
  cancelBtn.classList.add('cancel-btn')
  cancelBtn.textContent = 'Cancel'
  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    cancelEditing()
  })
  actions.appendChild(cancelBtn)

  const saveBtn = document.createElement('button')
  saveBtn.classList.add('save-btn')
  saveBtn.textContent = 'Save Changes'
  saveBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    saveEdits(polygonData.id)
  })
  actions.appendChild(saveBtn)

  form.appendChild(actions)

  return form
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

// Add event listener for save polygon button
document.getElementById('save-polygon-btn').addEventListener('click', function() {
  savePolygon(); // Call without parameters to trigger save
})

map.on('click', onMapClick)
