import { createSlice } from '@reduxjs/toolkit';
const initialState = {
  latitude: 0,
  longitude: 0,
  zoom: 16,};
const mapSlice = createSlice({
  name: 'form',
  initialState,
  reducers: {
    updateMap: (state, action) =>{return {... state, longitude:action.payload.longitude, latitude:action.payload.longitude, zoom:action.payload.zoom, markers: action.payload.markers}},//TODO
    updateLatitude: (state, action) => {state.latitude = action.payload;},
    updateLongitude: (state, action) => {state.longitude = action.payload;},
    updateZoom: (state, action) => {state.zoom = action.payload;},
  },});
export const {updateLatitude,updateLongitude,updateZoom, updateMap} = mapSlice.actions;
export default mapSlice.reducer;
