import React, { forwardRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Map from './Map.js';
import { updateMap } from '../../redux/MapSlice.js'; 
import Api from '../../api.js';

const aapi = new Api('alert', 'alert');

export const resetMap = async (mapRef) => {
  mapRef.current.resetUnsynchronizedMarkers();
  const newMarkers = await aapi.get('/farms/markers', null, "Error fetching farm markers");
  mapRef?.current?.setMarkers(newMarkers || []);
  mapRef?.current?.setMarkerSelected("");
};

export const toggleMarkerActive = (mapRef, setMarkerActive, setRemoveShapeActive) => {
  if (mapRef.current) {
    if (mapRef?.current?.nUnsynchronizedMarkers() > 1) return;
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

export const toggleRemoveMarker = (mapRef, setMarkerActive, setRemoveShapeActive) => {
  if (mapRef.current) {
    setRemoveShapeActive((prevState) => {
      const newState = !prevState;
      mapRef?.current?.setRemoveShapeActive(newState);
      if (newState) {
        setMarkerActive(false);
        mapRef?.current?.setMarkerActive(false);
        mapRef.current.renderCanvas();
      }
      return newState;
    });
  }
};

export const togglePolygonActive = (mapRef, setPolygonActive, setRemoveShapeActive) => {
  if (mapRef.current) {
    if (mapRef.current.hasNewPolygon()) return;
    setPolygonActive((prevState) => {
      const newState = !prevState;
      mapRef.current.polygonActive = newState;
      if (newState) {
        setRemoveShapeActive(false);
        mapRef.current.removeShape = false;
      }
      return newState;
    });
  }
};

export const toggleRemovePolygon = (mapRef, setPolygonActive, setRemoveShapeActive) => {
  if (mapRef.current) {
    setRemoveShapeActive((prevState) => {
      const newState = !prevState;
      mapRef.current.removeShape = newState;
      if (newState) {
        setPolygonActive(false);
        mapRef.current.polygonActive = false;
      }
      return newState;
    });
  }
};

export const MapContainer = forwardRef(({
  markerEndpoint,
  polygonEndpoint,
  onSelectedPolygonChanged,
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
  const polygonSelected = useSelector((state) => state.map.polygonSelected);

  const saveState = ({ longitude, latitude, zoom, markers, polygons, unsynchronizedMarkers, markerSelected, unsynchronizedPolygons, polygonSelected }) => {
    dispatch(updateMap({ longitude, latitude, zoom, markers, polygons, unsynchronizedMarkers, markerSelected, unsynchronizedPolygons, polygonSelected }));
  };

  const loadMarkers = async (set) => {
    set(longitude, latitude, zoom, [], [], unsynchronizedMarkers, markerSelected);
    try {
      const farmMarkers = await aapi.get(markerEndpoint, null, "There was an error fetching the farm markers");
      const markers1 = [...(markers && unsynchronizedMarkers ? markers.filter(marker => unsynchronizedMarkers.includes(marker.id)) : []), ...farmMarkers];
      set(longitude, latitude, zoom, markers1, [], unsynchronizedMarkers, markerSelected);
    } catch (e) {
      alert("Kartendaten konnten nicht vom Server abgerufen werden. " + e);
    }
  };

  const loadMarkersAndPolygons = async (set) => {
    set(longitude, latitude, zoom, markers, [], unsynchronizedMarkers, markerSelected, polygonSelected);
    try {
      const farmMarkers = await aapi.get(markerEndpoint, null, "There was an error fetching the farm markers");
      const fieldPolygons = await aapi.get(polygonEndpoint, null, "There was an error fetching the field polygons");
      const markers1 = [...(markers && unsynchronizedMarkers ? markers.filter(marker => unsynchronizedMarkers.includes(marker.id)) : []), ...farmMarkers];
      set(longitude, latitude, zoom, markers1, fieldPolygons, unsynchronizedMarkers, markerSelected, polygonSelected);
    } catch (e) {
      alert("Kartendaten konnten nicht vom Server abgerufen werden.");
    }
  };

  const loadPolygons = async (set) => {
    set(longitude, latitude, zoom, [], [], unsynchronizedMarkers, markerSelected, polygonSelected);
    try {
      const fieldPolygons = await aapi.get(polygonEndpoint, null, "There was an error fetching the field polygons");
      set(longitude, latitude, zoom, [], fieldPolygons, unsynchronizedMarkers, markerSelected, polygonSelected);
    } catch (e) {
      alert("Kartendaten konnten nicht vom Server abgerufen werden. " + e);
    }
  };
  

  let loadState;
  if (markerEndpoint && polygonEndpoint) { // If both endpoints are defined, load both
    loadState = loadMarkersAndPolygons;
  } else if (markerEndpoint) { // If only marker endpoint is defined
    loadState = loadMarkers;
  } else if (polygonEndpoint) { // If only polygon endpoint is defined
    loadState = loadPolygons;
  } else { // If no endpoints are defined
    loadState = () => {};
  }

  return (
    <Map
      width="640"
      height="480"
      canvas_width="600"
      canvas_height="400"
      ref={mapRef}
      onStateUpdate={saveState}
      onMount={loadState}
      onSelectedPolygonChanged={onSelectedPolygonChanged}
      onSelectedMarkerChanged={onSelectedMarkerChanged}
      onRemoveShape={onRemoveShape}
      {...props}
    />
  );
});
