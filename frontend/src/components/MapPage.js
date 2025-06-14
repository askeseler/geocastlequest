// src/App.js
import React, { useRef, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux'; // Import hooks
import { updateAddress, updateName } from '../redux/FormSlice'; // Import Redux actions
import { updateLongitude, updateLatitude, updateZoom} from '../redux/MapSlice'; // Import Redux actions
import crosshairIcon from '../icons/crosshair.svg'; // Adjust the path to your map icon
import { connect } from 'react-redux';
import { MapContainer } from './MapContainer';
import { toggleMarkerActive } from './MapContainer';


const MapPage = () => {
  const mapRef = useRef(); // Create a ref for the Map component
  const dispatch = useDispatch(); // Redux dispatch function

  // Define state for address and name
  const [markerActive, setMarkerActive] = useState(false);
  const [removeShapeActive, setRemoveShapeActive] = useState(false);
  //const [name, setName] = useState('');
  const name = useSelector((state) => state.form.name);
  const address = useSelector((state) => state.form.address);

  // Handle address input change
  const handleAddressChange = (event) => {
    dispatch(updateAddress(event.target.value)); // Dispatch action to update name
  };

  // Handle name input change
  const handleNameChange = (event) => {
      dispatch(updateName(event.target.value)); // Dispatch action to update name
  };

  // Handle search button click
  const handleSearchClick = () => {
    if (mapRef.current) {
      mapRef.current.fetchCoordinates(address);
    }
  };

  const saveToRedux = ({longitude, latitude, zoom}) => {
    dispatch(updateLongitude(longitude));
    dispatch(updateLatitude(latitude)); 
    dispatch(updateZoom(zoom)); 
  };

  //Load from redux when component mounts
  const longitude = useSelector((state) => state.map.longitude);
  const latitude = useSelector((state) => state.map.latitude);
  const zoom = useSelector((state) => state.map.zoom);
  const markers = useSelector((state) => state.map.markers);

  const loadFromRedux = (setData) => {
    setData(longitude, latitude, zoom, markers);
  };

  return (
    <>
      <div className="map-container">
        <MapContainer width="100%" height="100%" select_marker_pos ref={mapRef} onUnmount={saveToRedux} onMount={loadFromRedux} onAddMarker={()=>{alert("Added marker"); setMarkerActive(false);}}/>
        <div className="map-menu">
          <div className="map-input-group">
            <label className="map-input-label">Address</label>
            <div className="map-input-wrapper">
              <input
                type="text"
                name="address"
                value={address} // Bind address state
                onChange={handleAddressChange} // Call local handler
                className="map-input-field"
              />
              <button
                className="map-green-button"
                onClick={handleSearchClick} // Call local handler
                style={{width:"80px", height:"35px"}}
              >
                Search
              </button>
            </div>
          </div>

          <div className="map-input-group">
            <label className="map-input-label">Name</label>
            <div className="map-input-wrapper">
              <input
                type="text"
                name="name"
                value={name} // Bind name state
                onChange={handleNameChange} // Call local handler
                className="map-input-field"
              />

              <button className={markerActive?"map-green-button":"map-blue-button"} style={{width:"80px", height:"35px"}} onClick={()=>{toggleMarkerActive(mapRef, setMarkerActive, setRemoveShapeActive)}}>
                <img src={crosshairIcon} style={{width:"20px", height:"20px", }}>
              </img></button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

//const mapStateToProps = (state) => ({longitude: state.map.latitude, latitude: state.map.latitude, zoom: state.map.zoom, didLoad: state.map.didLoad});
//const mapDispatchToProps = {updateLongitude, updateLatitude, updateZoom, updateDidLoad};
//export default connect(mapStateToProps, mapDispatchToProps)(MapPage);
export default MapPage;
