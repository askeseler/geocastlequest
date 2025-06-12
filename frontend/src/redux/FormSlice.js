import { createSlice } from '@reduxjs/toolkit';
const initialState = {
  latitude: 0,
  longitude: 0,
  checkbox: false,
  inputField: '',
  name: '',
  address: '',};
const formSlice = createSlice({
  name: 'form',
  initialState,
  reducers: {
    updateLatitude: (state, action) => {state.latitude = action.payload;},
    incrementLongitude: (state) => {state.longitude += 1;},
    decrementLongitude: (state) => {state.longitude -= 1;},
    toggleCheckbox: (state) => {state.checkbox = !state.checkbox;},
    updateInputField: (state, action) => {state.inputField = action.payload;},
    updateName: (state, action) => {state.name = action.payload;},
    updateAddress: (state, action) => {state.address = action.payload;},
  },});
export const {updateLatitude,incrementLongitude,decrementLongitude,
	toggleCheckbox,updateInputField,updateName, updateAddress, updateSearchAddress} = formSlice.actions;
  export default formSlice.reducer;
