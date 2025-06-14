import './Map.css'; // Importing the CSS file for styles
import React, { Component } from "react";
import { nanoid } from 'nanoid';
import mapIcon from '../icons/map.svg'; // Adjust the path to your map icon
import markerIcon from '../icons/marker.svg';
import markerBlue from '../icons/marker.svg';
import markerGreen from '../icons/marker.svg'; 


import satelliteIcon from '../icons/satellite.svg'; 

class TileMap extends Component {
  constructor(props) {
    super(props);
    const n_tiles_pad = 2;

    let canvas_width = 500;//document.clientWidth;
    let canvas_height = 400;//document.clientHeight * .5;
    if(props.canvas_width) canvas_width = props.canvas_width;
    if(props.canvas_height) canvas_height = props.canvas_height;
    let tile_cluster_width = 255 * (2 * n_tiles_pad + 1);
    let tile_cluster_height = 255 * (2 * n_tiles_pad + 1);
    const shiftX = -(tile_cluster_width - canvas_width) / 2;
    const shiftY = -(tile_cluster_height - canvas_height) / 2;
    this.tileCanvas = React.createRef();
    this.tileCanvas1 = React.createRef();

    this.lock_fetch = false;//lock fetch such that there is no refetch until finished
    this.rendering = false;//lock rendering such that there is no rerender before finished
    this.tiles = [];
    this.dragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.offsetX = 0; // Offset due to current drag
    this.offsetY = 0;
    this.n_tiles_pad = n_tiles_pad;
    this.canvas_width = canvas_width;
    this.canvas_height = canvas_height;
    this.tile_cluster_width = tile_cluster_width;
    this.tile_cluster_height = tile_cluster_height;
    this.centerTileX = 10000; //132742,
    this.centerTileY = 89700; //90183,
    this.mapStyle = "map";

    this.markers = [];
    this.nMaxMarkers = 1;//add no more then nMaxMarkers
    this.markerSelected = "";
    this.markerActive = false;
    this.removeShape = false;

    this.isLoading = false; // Initialize loading flag
    this.initialShiftX = shiftX; //such that center tile is in center of canvas
    this.initialShiftY = shiftY;

    this.shiftX = shiftX;
    this.shiftY = shiftY;
    this.handleSearchClick = this.handleSearchClick.bind(this);
    this.toggleMapStyle = this.toggleMapStyle.bind(this);
    this.handleClick = this.handleClick.bind(this);

    this.onUnmount = this.onUnmount.bind(this);
    this.onMount = this.onMount.bind(this);
    this.setData = this.setData.bind(this);

    this.mouseX = 0;
    this.mouseY = 0;
    this.address = "";
    this.longitude = 0;//10.4541;//2.294694;
    this.latitude = 0;//51.1642;//48.8584;
    this.zoom = 19;
    this.extra_zoom = 1;
   }

  async stateUpdate() {
    if(this.props.onStateUpdate){
      await this.props.onStateUpdate({ longitude:this.longitude, latitude: this.latitude, zoom:this.zoom, markers:this.markers, 
         markerSelected:this.markerSelected,});
    }
    this.renderCanvas();
  }

  setLongitude(value) {
      this.longitude = value;
      this.stateUpdate();
  }

  setLatitude(value) {
      this.latitude = value;
      this.stateUpdate();
  }

  setZoom(value) {
      this.zoom = value;
      this.stateUpdate();
  }

  setMarkers(value) {
      this.markers = value;
      this.stateUpdate();
  }

  setMarkerSelected(value) {
      this.markerSelected = value;
      this.stateUpdate();
  }

  setMarkerActive(active = true){
    this.markerActive = active;
  }

  setRemoveShapeActive(active = true){
    this.removeShape = active;
  }

  getSelectedMarker(){
    return this.markers.find(marker => marker.id === this.markerSelected);
  }

  async doRemoveShape(id, shapeType) {
    if (this.props.onRemoveShape) {
      if (shapeType === "marker") {
        let canRemove = false;
        canRemove = await this.props.onRemoveShape(id, "marker");

        if (canRemove) {
          this.setMarkers(this.markers.filter(marker => marker.id !== id));
          this.renderCanvas();
        } else {
          alert("Could not delete shape.");
        }
      } 
      else {
        throw new Error("Marker Type must either be marker");
      }
      this.renderCanvas();
    }
  }

  toggleMapStyle = async () => {
    this.mapStyle = this.mapStyle === 'map' ? 'satellite' : 'map';
    await this.fetchTilesLonLat();
    this.setState({});
  };

  updateLongLat(){
    const displacementX = -this.offsetX + this.initialShiftX - this.shiftX;
    const displacementY = -this.offsetY + this.initialShiftY - this.shiftY;
    
    const { centerTileX, centerTileY, zoom } = this;
    const { longitude, latitude } = this.tileXYToLonLat(centerTileX + 0.5 + displacementX / 255, centerTileY + 0.5 + displacementY / 255, zoom);

    this.setLongitude(longitude);
    this.setLatitude(latitude);
  }
  
  handleZoomIn = async () => {
    if(this.zoom >= 19){//Do extra zoom
      if(this.extra_zoom > 1)return;
      this.extra_zoom = 2;
      this.shiftX = this.shiftX - this.canvas_width / 4;
      this.shiftY = this.shiftY - this.canvas_height / 4;
      this.updateLongLat();
      
      this.setState({}, this.renderCanvas);
      return;
    }
    this.setZoom(this.zoom + 1);
    await this.fetchTilesLonLat();
    this.setState({}, this.renderCanvas);
  };
  
  handleZoomOut = async () => {
    if(this.extra_zoom > 1){//Undo extra zoom
      this.extra_zoom = 1;
      this.shiftX = this.shiftX + this.canvas_width / 4;
      this.shiftY = this.shiftY + this.canvas_height / 4;
      this.updateLongLat();
      this.setState({}, this.renderCanvas);
      return;
    }
    this.setZoom(this.zoom - 1);
    await this.fetchTilesLonLat();
    this.setState({});
  };  
    

  lon2tile = (lon, zoom) => {
    return ((lon + 180) / 360) * Math.pow(2, zoom);
  };

  lat2tile = (lat, zoom) => {
    return (
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
      Math.pow(2, zoom)
    );
  };


  tileXYToLonLat(tileX, tileY, zoom) {
    const lon = (tileX / Math.pow(2, zoom)) * 360 - 180;

    const n = Math.PI - 2 * Math.PI * tileY / Math.pow(2, zoom);
    const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));

    return { longitude: lon, latitude: lat };
}

  fetchTilesXY = async () => {
    const {zoom, centerTileX, centerTileY, n_tiles_pad } = this;

    let tiles = await this.fetchTiles(
      zoom,
      centerTileX,
      centerTileY,
      n_tiles_pad,
      []
    );

    this.lock_fetch = false;
    this.tiles = tiles;
    this.setState({});  // Trigger re-render
  };

  fetchTiles = async (zoom, tileX, tileY, n_tiles_pad, currentTiles) => {
    const new_tile_coords = [];
    for (let i = -n_tiles_pad; i <= n_tiles_pad; i++) {
      for (let j = -n_tiles_pad; j <= n_tiles_pad; j++) {
        const x = tileX + i;
        const y = tileY + j;
        new_tile_coords.push({ x, y });
      }
    }

    const newTileKeys = new Set(
      new_tile_coords.map((coord) => `${coord.x},${coord.y}`)
    );

    const updatedCurrentTiles = currentTiles.filter((tile) => {
      const coordKey = `${tile.x},${tile.y}`;
      return newTileKeys.has(coordKey);
    });

    const newTiles = [];
    for (const { x, y } of new_tile_coords) {
      const coordKey = `${x},${y}`;
      if (!currentTiles.some((tile) => `${tile.x},${tile.y}` === coordKey)) {
        let url;
        if(this.mapStyle==="satellite"){url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile//${zoom}/${y}/${x}`;}
        if(this.mapStyle==="map"){url = `https://a.tile.openstreetmap.org/${zoom}/${x}/${y}.png`};
        try {
          const response = await fetch(url);//, { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
          const blob = await response.blob();
          const imgURL = URL.createObjectURL(blob);
          newTiles.push({
            x: x + n_tiles_pad,
            y: y + n_tiles_pad,
            imgURL,
          });
        } catch (error) {
          console.error("Failed to fetch tile:", error);
        }
      }
    }
    console.log("exit fetchTiles")
    return [...updatedCurrentTiles, ...newTiles];
  };

  drawLoadingAnimation = (ctx) => {
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const radius = 50; // Radius of the rotating arc
    const lineWidth = 5;
    const arcLength = Math.PI / 4; // Length of the arc (adjust to change the size of the segment)
  
    // Clear the canvas before each frame
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
    // Save the canvas state
    ctx.save();
    ctx.translate(centerX, centerY);
  
    // Calculate rotation based on time (full rotation every second)
    const timeInSeconds = Date.now() / 1000;
    const angle = (timeInSeconds % 1) * (2 * Math.PI); // 360 degrees / 1 second
  
    // Set line style
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = '#007BFF';
  
    // Draw a rotating arc (segment of a circle)
    ctx.beginPath();
    ctx.arc(0, 0, radius, angle, angle + arcLength); // Draw part of the circle
    ctx.stroke();
  
    // Restore the canvas state
    ctx.restore();
  };

animateLoading = (ctx) => {
    if (this.isLoading) {
        this.drawLoadingAnimation(ctx);
        setTimeout(() => {
          this.animateLoading(ctx);
        }, 50);
    }
};

fetchTilesLonLat = async () => {
    const { n_tiles_pad, longitude, latitude, zoom } = this;
    if(zoom>19) this.setZoom(19);

    this.isLoading = true;
    if(!this.tileCanvas)return;
    const canvas = this.tileCanvas.current;
    const ctx = canvas.getContext('2d');

    this.animateLoading(ctx); // Start loading animation

    try {
        const x_dash = this.lon2tile(longitude, zoom);
        const y_dash = this.lat2tile(latitude, zoom);
        const x = Math.floor(x_dash);
        const y = Math.floor(y_dash);

        const shiftX = this.initialShiftX + Math.floor(255 * (x - x_dash)) + 128;
        const shiftY = this.initialShiftY + Math.floor(255 * (y - y_dash)) + 128;

        let tiles = await this.fetchTiles(zoom, x, y, n_tiles_pad, []);
        
        // Update instance variables with new values
        this.centerTileX = x;
        this.centerTileY = y;
        this.tiles = tiles;
        this.shiftX = shiftX;
        this.shiftY = shiftY;

        await this.renderCanvas();
    } catch (error) {
        console.error("Error fetching tiles or rendering:", error);
    } finally {
        this.isLoading = false; // Stop loading
    }
};


drawTiles = async (offsetX, shiftX, offsetY, shiftY, centerTileX, centerTileY) => {
  const canvas1 = this.tileCanvas1.current;    // Off-screen (buffer) canvas
  
  // Check if the canvas is available
  if (!canvas1) {
    console.error("Canvas element is not available");
    return; // Exit the function if canvas is not available
  }

  const ctx = canvas1.getContext("2d");     // Get context of the buffer canvas
  ctx.imageSmoothingEnabled = false;         // Disable smoothing for pixel art, if applicable
  const tileSize = 255;                       // Size of each tile

  // Clear the buffer canvas before rendering
  ctx.clearRect(0, 0, canvas1.width, canvas1.height);

  // Use Promise.all to handle asynchronous image loading for each tile
  const imagePromises = this.tiles.map((tile) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = tile.imgURL;

      img.onload = () => {
        const xPos = (tile.x - Math.floor(centerTileX)) * tileSize + offsetX + shiftX;
        const yPos = (tile.y - Math.floor(centerTileY)) * tileSize + offsetY + shiftY;

        // Draw the tile image on the buffer canvas
        ctx.drawImage(img, xPos, yPos, tileSize, tileSize);
        resolve(); // Resolve the promise after drawing the image
      };

      img.onerror = (err) => {
        console.error("Error loading image:", tile.imgURL, err);
        reject(err); // Reject the promise if the image fails to load
      };
    });
  });

  try {
    // Wait for all image loading promises to resolve
    await Promise.all(imagePromises);
  } catch (error) {
    console.error("Error drawing tiles:", error);
  }
};

lonLat2pxPos(this_longitude, this_latitude, zoom, longitude, latitude, canvas_width, canvas_height) {
  let x = this.lon2tile(this_longitude, zoom);
  let y = this.lat2tile(this_latitude, zoom);
  let x_dash = this.lon2tile(longitude, zoom);
  let y_dash = this.lat2tile(latitude, zoom);
  
  let x_px_pos = (canvas_width / 2) + (255 * (x_dash - x));
  let y_px_pos = (canvas_height / 2) + (255 * (y_dash - y));

  return { x_px_pos, y_px_pos };
}

drawMarkers = async (longitude, latitude, zoom, canvas_width, canvas_height) => {
  const canvas1 = this.tileCanvas1.current;
  const ctx = canvas1.getContext('2d');

  const [marker_shift_x, marker_shift_y] = [-50, -95];

  let markersLoaded = 0;

  if (this.markerActive) {
      await this.drawSvg(markerIcon, this.mouseX +marker_shift_x, this.mouseY + marker_shift_y);
  }

  return new Promise((resolve) => {
      if (this.markers.length === 0) {
          resolve();  // Resolve immediately if there are no markers
      }

      this.markers.forEach(async (marker) => {
        const { x_px_pos, y_px_pos } = this.lonLat2pxPos(longitude, latitude, zoom, marker["coordinates"][0], marker["coordinates"][1], canvas_width, canvas_height);

        if (this.markerSelected === marker.id)
            await this.drawSvg(markerGreen, x_px_pos + marker_shift_x, y_px_pos + marker_shift_y);
          
          else await this.drawSvg(markerIcon, x_px_pos + marker_shift_x, y_px_pos + marker_shift_y);
          markersLoaded++;

          if (markersLoaded === this.markers.length) {
              resolve();
        }
      });
  });
};

drawSvg = async (icon_src, x, y) => {
  const canvas = this.tileCanvas1.current;
  const ctx = canvas.getContext('2d');

  return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = icon_src;  // Set the src to the imported SVG URL

      img.onload = () => {
          // Draw the SVG icon (e.g., marker) on the buffer canvas
          ctx.drawImage(img, x, y, 100, 100);
          resolve();  // Resolve the promise once the image has been drawn
      };

      img.onerror = (error) => {
          reject(new Error("Failed to load SVG image: " + error));
      };
  });
};

renderCanvas = async () => {
  if(!this.tileCanvas.current ||!this.tileCanvas1.current)return;
  const canvas = this.tileCanvas.current;      // Main canvas for display
  const canvas1 = this.tileCanvas1.current;    // Off-screen (buffer) canvas
  const displayCtx = canvas.getContext("2d");

  if(!this.rendering){
    this.rendering = true;
    let {offsetX, shiftX, offsetY, shiftY, centerTileX, centerTileY} = this;
    let {longitude, latitude, zoom, canvas_width, canvas_height} = this;
    await this.drawTiles(offsetX, shiftX, offsetY, shiftY, centerTileX, centerTileY);
    await this.drawMarkers(longitude, latitude, zoom, canvas_width, canvas_height);
    displayCtx.drawImage(canvas1, 0, 0);
    this.rendering = false;
  }
};

  handleMouseDown = (e) => {
    this.dragging = true;
    const clientX = e.changedTouches?.[0]?.clientX ?? e.clientX;
    const clientY = e.changedTouches?.[0]?.clientY ?? e.clientY;
    this.dragStartX = clientX;
    this.dragStartY = clientY;
    this.setState({});  // Trigger re-render
  };

  handleMouseMove = (e) => {
    if (this.isLoading) return;
    typeof e.preventDefault === "function" && e.preventDefault();
    typeof e.stopPropagation === "function" && e.stopPropagation();

    // Determine clientX and clientY for both touch and mouse events
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;

    if (this.dragging) {
      const offsetX = clientX - this.dragStartX;
      const offsetY = clientY - this.dragStartY;
      
      // displacement in pixels:
      let displacementX =
        -this.offsetX + this.initialShiftX - this.shiftX;
      let displacementY =
        -this.offsetY + this.initialShiftY - this.shiftY;

      let {centerTileX, centerTileY, shiftX, shiftY, zoom } = this;

      let {longitude, latitude} = this.tileXYToLonLat(centerTileX + 0.5 + displacementX/255 ,
                                           centerTileY + 0.5 + displacementY/255 , zoom);
      if (this.lock_fetch) {
        console.log("locked");
      } else {      
        if (displacementX > 255 || displacementX < -255) {
          this.lock_fetch = true;
          centerTileX += Math.round(displacementX / 255);
          shiftX = this.initialShiftX - offsetX;
        }
      
        if (displacementY > 255 || displacementY < -255) {
          this.lock_fetch = true;
          centerTileY += Math.round(displacementY / 255);
          shiftY = this.initialShiftY - offsetY;
        }
      
        if (this.lock_fetch) {
          this.centerTileX = centerTileX;
          this.centerTileY = centerTileY;
          this.shiftX = shiftX;
          this.shiftY = shiftY;
          this.offsetX = offsetX;
          this.offsetY = offsetY;
          this.fetchTilesXY(); // Call the method      
          this.forceUpdate(); // Trigger re-render    
        }
      }
      
      this.longitude = longitude;// Do not use setLongitude for performance. Upon mouse up this stateUpdate will be called.
      this.latitude = latitude;
      this.offsetX = offsetX;
      this.offsetY = offsetY;
      
      this.renderCanvas(); // Call the method
      
    }
    const rect = this.tileCanvas.current.getBoundingClientRect();
    this.mouseX = (clientX - rect.left) * (this.tileCanvas.current.width / rect.width);
    this.mouseY = (clientY - rect.top) * (this.tileCanvas.current.height / rect.height);
    
    this.renderCanvas();
  };

  handleMouseUp = (e) => {
    const clientX = e.changedTouches?.[0]?.clientX ?? e.clientX;
    const clientY = e.changedTouches?.[0]?.clientY ?? e.clientY;
    this.handleMouseMove({ ...e, clientX, clientY });
    this.dragging = false;
    this.stateUpdate();
    this.shiftX += this.offsetX;
    this.shiftY += this.offsetY;
    this.offsetY = 0;
    this.offsetX = 0;

    //const offsetX = clientX - this.dragStartX;
    //const offsetY = clientY - this.dragStartY;
  };

  componentDidMount() {
    const canvas = this.tileCanvas.current;
    canvas.addEventListener("mousedown", this.handleMouseDown);
    canvas.addEventListener("mousemove", this.handleMouseMove);
    canvas.addEventListener("mouseup", this.handleMouseUp);

    canvas.addEventListener("touchstart", this.handleMouseDown, { passive: false });
    canvas.addEventListener("touchmove", this.handleMouseMove, { passive: false });
    canvas.addEventListener("touchend", this.handleMouseUp);

    window.addEventListener("beforeunload", this.onUnmount);
    this.onMount();
  }

  componentWillUnmount() {
    window.removeEventListener("beforeunload", this.onUnmount);

    const canvas = this.tileCanvas.current;
    canvas.removeEventListener("mousedown", this.handleMouseDown);
    canvas.removeEventListener("mousemove", this.handleMouseMove);
    canvas.removeEventListener("mouseup", this.handleMouseUp);
  
    canvas.removeEventListener("touchstart", this.handleMouseDown);
    canvas.removeEventListener("touchmove", this.handleMouseMove);
    canvas.removeEventListener("touchend", this.handleMouseUp);
  }

  async setData(longitude, latitude, zoom, markers) {
    if (
      longitude === undefined ||
      latitude === undefined ||
      zoom === undefined ||
      markers === undefined
    ) {
      throw new Error(
        "No argument must be undefined " +
          JSON.stringify([longitude, latitude, zoom, markers])
      );
    }

    this.markers = markers;
    this.longitude = longitude;
    this.latitude = latitude;
    this.zoom = zoom;

    await this.fetchTilesLonLat();
    await this.renderCanvas();
  }

  async onMount() {
    if (this.props.onMount) {
      this.props.onMount(this.setData);
      this.renderCanvas();
    }
  }

  async onUnmount(e){// Provide hook to save longitude, latitude and zoom. To be used by parent component e.g. with redux.
    if(this.props.onUnmount){
          await this.props.onUnmount({ longitude:this.longitude, latitude: this.latitude, zoom:this.zoom, markers:this.markers, markerSelected:this.markerSelected});
    }
  }

  componentWillUnmount() {
    const canvas = this.tileCanvas.current;
    canvas.removeEventListener("mousedown", this.handleMouseDown);
    canvas.removeEventListener("mousemove", this.handleMouseMove);
    canvas.removeEventListener("mouseup", this.handleMouseUp);
  }

  async fetchCoordinates(address) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`, {
            headers: {
                'User-Agent': 'YourAppName/0.1'
            }
        });
        
        const res = await response.json();
        
        if (res.length > 0) {
            //alert("Found coordinates");
            let { lat, lon } = res[0];

            // Parse lat and lon from response to number
            lat = parseFloat(lat);
            lon = parseFloat(lon);

            // Set longitude and latitude
            this.setLongitude(lon);
            this.setLatitude(lat);

            // Fetch tiles after setting coordinates
            await this.fetchTilesLonLat();

            // Wait for rendering to complete
            await this.renderCanvas();
        } else {
            alert('Address not found');
        }
    } catch (err) {
        console.error(err);
    }
}

  handleSearchClick(address) {
    if(address)this.address = address;
    if(this.address !== "")this.fetchCoordinates(address);
  }

  fillCanvasWithGray() {
    const canvas = this.tileCanvas.current;
    const ctx = canvas.getContext('2d');
    
    // Fill the entire canvas with dark gray
    ctx.fillStyle = '#404040'; // Set the fill color to a darker gray
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill the rectangle
  }

  mouseLonLat(){
      // Calculate the center position of the central tile
      let pointX =
      this.shiftX +
      this.offsetX +
      this.tile_cluster_width / 2 -
      128;
    let pointY =
      this.shiftY +
      this.offsetY +
      this.tile_cluster_height / 2 -
      128;

      let displacementX =  - (pointX - this.mouseX) - 128;
      let displacementY = - (pointY - this.mouseY) - 128;

      let {zoom, centerTileX, centerTileY} = this;

      let {longitude, latitude} = this.tileXYToLonLat(centerTileX + 0.5 + displacementX/255 ,centerTileY + 0.5 + displacementY/255 , zoom);
      return {longitude, latitude};
    }

  addMarker(){
      let {longitude, latitude} = this.mouseLonLat();
      let id = nanoid(12);
      this.setMarkers([{ "coordinates":[longitude, latitude], type: "Point", "id":id }, ...this.markers]);
      this.setMarkerSelected(id);
      this.markerActive = false;
      if (this.props.onAddMarker) this.props.onAddMarker();
      this.renderCanvas();
      this.forceUpdate();
    }
    
    handleClick = (event) => {
      if(this.markerActive && !this.removeShape)this.addMarker();
      if(!this.markerActive){
      const canvas = this.tileCanvas.current;
      const realHeight = canvas.height;
      const cssHeight = canvas.getBoundingClientRect().height; // Scaled height via CSS
      if(!this.markerActive){
        for(let marker of this.markers){
          const { x_px_pos, y_px_pos } = this.lonLat2pxPos(this.longitude, this.latitude, this.zoom, marker["coordinates"][0], marker["coordinates"][1], this.canvas_width, this.canvas_height);
          const xCenter = x_px_pos;// - 50 * (cssWidth/realWidth);
          const yCenter = y_px_pos - 60 * (cssHeight/realHeight);
          const distance = Math.sqrt((this.mouseX - xCenter) ** 2 + (this.mouseY - yCenter) ** 2);
            if (distance < 30) {
              alert("clicked")
                if(this.removeShape){
                  this.doRemoveShape(marker["id"], "marker")
                }
                else{
                  this.setMarkerSelected(marker["id"]);
                  if(this.props.onSelectedMarkerChanged)this.props.onSelectedMarkerChanged(marker["id"]);
                  this.renderCanvas();
                }
            }
          }
      }
    }
  };

  render() {
    return (
      <>
      <div className="canvas-container">
        <canvas
          ref={this.tileCanvas}
          width={this.canvas_width / this.extra_zoom}
          height={this.canvas_height / this.extra_zoom}
          style={{width: "100%", height:"100%"}}
          onClick={this.handleClick}
          />
        <canvas
          ref={this.tileCanvas1}
          width={this.canvas_width / this.extra_zoom}
          height={this.canvas_height / this.extra_zoom}
          style={{width: "100%", height:"100%", 'display': 'none' }}
          />
          
        <div className="map-zoom-controls">
                <button className="map-plus-button" onClick={this.handleZoomIn}>+</button>
                <button className="map-minus-button" onClick={this.handleZoomOut}>−</button>
            </div>
            <div className="map-style-controls">
            <button className="toggle-map-satellite" onClick={this.toggleMapStyle}>
            <img src={this.mapStyle === 'map' ? satelliteIcon : mapIcon} alt={`${this.mapStyle} view`} />
            </button>
            </div>
        </div>
      </>
    );
  }
}

export default TileMap;