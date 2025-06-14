import React, { forwardRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Map from './Map.js';
import { updateMap } from '../redux/MapSlice.js'; 
import Api from '../api.js';

const aapi = new Api('alert', 'alert');

export const toggleMarkerActive = (mapRef, setMarkerActive, setRemoveShapeActive) => {
  if (mapRef.current) {
    setMarkerActive((prevState) => {
      const newState = !prevState;
      mapRef.current.setMarkerActive(newState);
      if (newState) {
        setRemoveShapeActive(false);
        mapRef?.current?.setRemoveShapeActive(false);
        mapRef.current.renderCanvas();
      }
      return newState;
    });
  }
};

export const MapContainer = forwardRef(({
  markerEndpoint,
  onSelectedMarkerChanged,
  onRemoveShape,
  ...props
}, mapRef) => {
  const dispatch = useDispatch();

  const longitude = useSelector((state) => state.map.longitude);
  const latitude = useSelector((state) => state.map.latitude);
  const markerSelected = useSelector((state) => state.map.markerSelected);
  const zoom = useSelector((state) => state.map.zoom);
  const markers = useSelector((state) => state.map.markers);
  const unsynchronizedMarkers = useSelector((state) => state.map.unsynchronizedMarkers);

  const saveState = ({ longitude, latitude, zoom, markers }) => {
    dispatch(updateMap({ longitude, latitude, zoom, markers }));
  };

  const loadMarkersFromBackend = async (set) => {
    set(longitude, latitude, zoom, [], [], unsynchronizedMarkers, markerSelected);
    try {
      const farmMarkers = await aapi.get(markerEndpoint, null, "There was an error fetching the farm markers");
      const markers1 = [...(markers && unsynchronizedMarkers ? markers.filter(marker => unsynchronizedMarkers.includes(marker.id)) : []), ...farmMarkers];
      set(longitude, latitude, zoom, markers1, [], unsynchronizedMarkers, markerSelected);
    } catch (e) {
      alert("Kartendaten konnten nicht vom Server abgerufen werden. " + e);
    }
  };

  const loadState = async (set) => {
    set(longitude, latitude, zoom, []);
  };

  return (
    <Map
      width="640"
      height="480"
      canvas_width="600"
      canvas_height="500"
      ref={mapRef}
      onStateUpdate={saveState}
      onMount={loadState}
      onSelectedMarkerChanged={onSelectedMarkerChanged}
      onRemoveShape={onRemoveShape}
      {...props}
    />
  );
});
