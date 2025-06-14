import { createSlice } from '@reduxjs/toolkit';
const initialState = {
 latitude: 0,
 longitude: 0,
 zoom: 16,
 markers: [],  
 polygons: [],
 unsynchronizedPolygons: [],
 unsynchronizedMarkers: [],
 markerSelected: "",
 polygonSelected: ""};

const mapSlice = createSlice({
 name: 'form',
 initialState,
 reducers: {
   updateLatitude: (state, action) => ({ ...state, latitude: action.payload }),
   updateLongitude: (state, action) => ({ ...state, longitude: action.payload }),
   updateZoom: (state, action) => ({ ...state, zoom: action.payload }),
   updateMarkers: (state, action) => ({ ...state, markers: action.payload }),
   updatePolygons: (state, action) => ({ ...state, polygons: action.payload }),
   updateUnsynchronizedPolygons: (state, action) => ({ ...state, polygons: action.payload }),
   updateAddress: (state, action) => ({ ...state, address: action.payload }),
   updateMarkerSelected: (state, action) => ({ ...state, markerSelected: action.payload }),

   updateMap: (state, action) => {
    return {
      ...state,
      longitude: action.payload.longitude !== undefined ? action.payload.longitude : state.longitude,
      latitude: action.payload.latitude !== undefined ? action.payload.latitude : state.latitude,
      zoom: action.payload.zoom !== undefined ? action.payload.zoom : state.zoom,
      markers: action.payload.markers !== undefined ? action.payload.markers : state.markers,
      polygons: action.payload.polygons !== undefined ? action.payload.polygons : state.polygons,
      unsynchronizedMarkers: action.payload.unsynchronizedMarkers !== undefined ? action.payload.unsynchronizedMarkers : state.unsynchronizedMarkers,
      markerSelected: action.payload.markerSelected !== undefined ? action.payload.markerSelected : state.markerSelected,
      unsynchronizedPolygons: action.payload.unsynchronizedMarkers !== undefined ? action.payload.unsynchronizedMarkers : state.unsynchronizedMarkers,
      polygonSelected: action.payload.polygonSelected !== undefined ? action.payload.polygonSelected : state.polygonSelected,
    };
  },
   resetMap: () => initialState,
   resetPos: (state) => {
    state.latitude = initialState.latitude;
    state.longitude = initialState.longitude;
    state.zoom = initialState.zoom;
  }
 },
 });
export const {updateLatitude,updateLongitude,updateZoom,updateMarkers,updateAddress,resetMap,resetPos,updatePolygons,updateMap,updateUnsynchronizedPolygons, updateMarkerSelected} = mapSlice.actions;
export default mapSlice.reducer;
