// src/store/SearchSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  msg: ''
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setAttr: (state, action) => {
      const updates = action.payload;
      Object.entries(updates).forEach(([key, value]) => {
        state[key] = value;
      });
    }
  }
});

export const { setAttr } = searchSlice.actions;
export default searchSlice.reducer;