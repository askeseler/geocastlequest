import { createSlice } from '@reduxjs/toolkit';
const initialState = {
  latitude: 0,
  longitude: 0,
  zoom: 16,};
const mapSlice = createSlice({
  name: 'form',
  initialState,
  reducers: {
    updateLatitude: (state, action) => {state.latitude = action.payload;},
    updateLongitude: (state, action) => {state.longitude = action.payload;},
    updateZoom: (state, action) => {state.zoom = action.payload;},
  },});
export const {updateLatitude,updateLongitude,updateZoom} = mapSlice.actions;
export default mapSlice.reducer;
