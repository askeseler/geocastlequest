import React, { Component } from "react";
import './Map.css'; // Importing the CSS file for styles
import mapIcon from '../icons/map.svg'; // Adjust the path to your map icon
import markerIcon from '../icons/marker.svg'; 
import satelliteIcon from '../icons/satellite.svg'; 

class TileMap extends Component {
  constructor(props) {
    super(props);
    const n_tiles_pad = 2;
    let tile_cluster_width = 256 * (2 * n_tiles_pad + 1);
    let tile_cluster_height = 256 * (2 * n_tiles_pad + 1);
    let canvas_width = 600;//document.clientWidth;
    let canvas_height = 500;//document.clientHeight * .5;

    const shiftX = -(tile_cluster_width - canvas_width) / 2;
    const shiftY = -(tile_cluster_height - canvas_height) / 2;

    this.lock_fetch = false;//lock fetch such that there is no refetch until finished
    this.rendering = false;//lock rendering such that there is no rerender before finished
    this.tiles= [];
    this.dragging= false;
    this.dragStartX= 0;
    this.dragStartY= 0;
    this.offsetX= 0; // Offset due to current drag
    this.offsetY= 0;
    this.n_tiles_pad= n_tiles_pad;
    this.canvas_width= canvas_width;
    this.canvas_height= canvas_height;
    this.tile_cluster_width= tile_cluster_width;
    this.tile_cluster_height= tile_cluster_height;
    this.centerTileX= 10000; //132742,
    this.centerTileY= 89700; //90183,
    this.mapStyle= "map";
    this.markers= [];
    this.markerActive = false;
    this.isLoading = false; // Initialize loading flag

    this.initialShiftX = shiftX; //such that center tile is in center of canvas
    this.initialShiftY = shiftY;

    this.shiftX = shiftX;
    this.shiftY = shiftY;
    this.handleSearchClick = this.handleSearchClick.bind(this);
    this.toggleMapStyle = this.toggleMapStyle.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.mouseX = 0;
    this.mouseY = 0;
    this.address = "";
    this.longitude = 2.294694;
    this.latitude = 48.8584;
    this.zoom = 19;

   }

   toggleMarkerActive(){
    this.markerActive = !this.markerActive;
    this.setState({});
  }

  toggleMapStyle = async () => {
    this.mapStyle = this.mapStyle === 'map' ? 'satellite' : 'map';
    await this.fetchTilesLonLat();
    this.setState({});
  };
  
  handleZoomIn = async () => {
    this.zoom = this.zoom + 1;
    await this.fetchTilesLonLat();
    this.setState({});
  };
  
  handleZoomOut = async () => {
    this.zoom = this.zoom - 1;
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

    //alert("fetchTilesXY");

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
          const response = await fetch(url);
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
    const radius = 20;
    const lineWidth = 5;
    const angle = Date.now() / 100;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = '#007BFF';
    ctx.stroke();
    ctx.restore();
};

animateLoading = (ctx) => {
    if (this.isLoading) {
        this.drawLoadingAnimation(ctx);
        requestAnimationFrame(() => this.animateLoading(ctx));
    } else {
    }
};

fetchTilesLonLat = async () => {
    const { n_tiles_pad, longitude, latitude, zoom } = this;

    this.isLoading = true;
    const canvas = this.refs.tileCanvas;
    const ctx = canvas.getContext('2d');

    this.animateLoading(ctx); // Start loading animation

    try {
        // Your existing code for fetching tiles
        const x_dash = this.lon2tile(longitude, zoom);
        const y_dash = this.lat2tile(latitude, zoom);
        const x = Math.floor(x_dash);
        const y = Math.floor(y_dash);

        const shiftX = this.initialShiftX + Math.floor(256 * (x - x_dash)) + 128;
        const shiftY = this.initialShiftY + Math.floor(256 * (y - y_dash)) + 128;

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


// Method to draw tiles on the buffer canvas
drawTiles = async (offsetX, shiftX, offsetY, shiftY, centerTileX, centerTileY) => {
  const canvas1 = this.refs.tileCanvas1;    // Off-screen (buffer) canvas
  const ctx = canvas1.getContext("2d");     // Get context of the buffer canvas
  ctx.imageSmoothingEnabled = false;         // Disable smoothing for pixel art, if applicable
  const tileSize = 255;                       // Size of each tile

  // Clear the buffer canvas before rendering
  ctx.clearRect(0, 0, canvas1.width, canvas1.height);

  // Track how many images have loaded
  let imagesLoaded = 0;
  //console.log("tiles length"+this.tiles.length);
  return new Promise((resolve) => {
      this.tiles.forEach((tile) => {
          const img = new Image();
          img.src = tile.imgURL;

          img.onload = () => {
              const xPos =
                  (tile.x - Math.floor(centerTileX)) * tileSize +
                  offsetX +
                  shiftX;
              const yPos =
                  (tile.y - Math.floor(centerTileY)) * tileSize +
                  offsetY +
                  shiftY;

              // Draw the tile image on the buffer canvas
              ctx.drawImage(img, xPos, yPos, tileSize, tileSize);
              imagesLoaded++;

              // Once all tiles are drawn, resolve the promise
              if (imagesLoaded === this.tiles.length) {
                  resolve();
              }
          };
      });
  });
};

drawMarkers = async (longitude, latitude, zoom, canvas_width, canvas_height) => {
  const canvas1 = this.refs.tileCanvas1;
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
          // Calculate marker position
          let x = this.lon2tile(longitude, zoom);
          let y = this.lat2tile(latitude, zoom);
          let x_dash = this.lon2tile(marker["longitude"], zoom);
          let y_dash = this.lat2tile(marker["latitude"], zoom);
          let x_px_pos = (canvas_width / 2) + (255 * (x_dash - x));
          let y_px_pos = (canvas_height / 2) + (255 * (y_dash - y));

          await this.drawSvg(markerIcon, x_px_pos + marker_shift_x, y_px_pos + marker_shift_y);
          markersLoaded++;

          // Resolve the promise once all markers are drawn
          if (markersLoaded === this.markers.length) {
              resolve();
          }
      });
  });
};

// Helper function to draw an SVG image asynchronously
drawSvg = async (icon_src, x, y) => {
  const canvas = this.refs.tileCanvas1;
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
  if(!this.refs.tileCanvas ||!this.refs.tileCanvas1)return;
  const canvas = this.refs.tileCanvas;      // Main canvas for display
  const canvas1 = this.refs.tileCanvas1;    // Off-screen (buffer) canvas
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
    if (this.dragging) {
      const offsetX = e.clientX - this.dragStartX;
      const offsetY = e.clientY - this.dragStartY;
      
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
      
      this.longitude = longitude;
      this.latitude = latitude;
      this.offsetX = offsetX;
      this.offsetY = offsetY;
      
      this.renderCanvas(); // Call the method
      
    }
    const rect = this.refs.tileCanvas.getBoundingClientRect();
    this.mouseX = (e.clientX - rect.left) * (this.refs.tileCanvas.width / rect.width);
    this.mouseY = (e.clientY - rect.top) * (this.refs.tileCanvas.height / rect.height);
    
    this.renderCanvas();
  };

  handleMouseUp = () => {
    this.dragging = false;
    this.shiftX += this.offsetX;
    this.shiftY += this.offsetY;
    this.offsetY = 0;
    this.offsetX = 0;
    
    this.forceUpdate(); // Trigger re-render    
  };

  componentDidMount() {
    const canvas = this.refs.tileCanvas;
    canvas.addEventListener("mousedown", this.handleMouseDown);
    canvas.addEventListener("mousemove", this.handleMouseMove);
    canvas.addEventListener("mouseup", this.handleMouseUp);
    this.fillCanvasWithGray();

    if (this.props.onMount) {
      if (this.props.longitude) this.longitude = this.props.longitude;
      if (this.props.latitude) this.latitude = this.props.latitude;
      if (this.props.zoom) this.zoom = this.props.zoom;
      
      this.props.onMount(async (longitude, latitude, zoom) => {
        this.longitude = longitude;
        this.latitude = latitude;
        this.zoom = zoom;
        await this.fetchTilesLonLat();
      });
    }
  }
  
  componentWillUnmount() {
    const canvas = this.refs.tileCanvas;
    canvas.removeEventListener("mousedown", this.handleMouseDown);
    canvas.removeEventListener("mousemove", this.handleMouseMove);
    canvas.removeEventListener("mouseup", this.handleMouseUp);

    // Provide hook to save longitude, latitude and zoom. To be used by parent component e.g. with redux.
    if(this.props.onUnmount){
      //const { longitude, latitude, zoom } = this;
      this.props.onUnmount({ longitude:this.longitude, latitude: this.latitude, zoom:this.zoom });
    }
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
            this.longitude = lon;
            this.latitude = lat;

            // Fetch tiles after setting coordinates
            await this.fetchTilesLonLat();  // Assuming fetchTilesLonLat is also a promise

            // Wait for rendering to complete
            await this.renderCanvas();  // Ensure renderCanvas is a promise
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
    const canvas = this.refs.tileCanvas;
    const ctx = canvas.getContext('2d');
    
    // Fill the entire canvas with dark gray
    ctx.fillStyle = '#404040'; // Set the fill color to a darker gray
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill the rectangle
}

  addMarker(){
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
      this.markers = [{ longitude: longitude, latitude: latitude, type: "default" }, ...this.markers];

      this.forceUpdate(); // Trigger re-render
      this.toggleMarkerActive(); // Call the method after updating markers
      
    }
    
    handleClick = (event) => {
      if(this.markerActive)this.addMarker();
      if(!this.markerActive){

      const canvas = this.refs.tileCanvas;
      const realHeight = canvas.height;
      const cssHeight = canvas.getBoundingClientRect().height; // Scaled height via CSS

      for(let marker of this.markers){
        let x = this.lon2tile(this.longitude, this.zoom);
        let y = this.lat2tile(this.latitude, this.zoom);
        let x_dash = this.lon2tile(marker["longitude"], this.zoom);
        let y_dash = this.lat2tile(marker["latitude"], this.zoom);
        let x_px_pos = (this.canvas_width / 2) + (255 * (x_dash - x));
        let y_px_pos = (this.canvas_height / 2) + (255 * (y_dash - y));

        console.log(`x_px_pos: ${x_px_pos}, y_px_pos: ${y_px_pos}`)
        
        console.log("mouseX " + this.mouseX);
        console.log("mouseY " + this.mouseY);

        const xCenter = x_px_pos;// - 50 * (cssWidth/realWidth);
        const yCenter = y_px_pos - 95 * (cssHeight/realHeight);
        
        const distance = Math.sqrt((this.mouseX - xCenter) ** 2 + (this.mouseY - yCenter) ** 2);
  
        if (distance < 30) {
            alert("Clicked");
        }
      }
    }
  };

  render() {
    return (
      <>
      <div className="canvas-container">
        <canvas
          ref="tileCanvas"
          width={this.canvas_width}
          height={this.canvas_height}
          style={{width: "100%", height:"100%"}}
          onClick={this.handleClick}
          />
        <canvas
          ref="tileCanvas1"
          width={this.canvas_width}
          height={this.canvas_height}
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
