// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import formReducer from './FormSlice';
import mapReducer from './MapSlice';
import searchReducer from './SearchSlice';
import { combineReducers } from 'redux';
const rootReducer = combineReducers({form: formReducer, map: mapReducer,  search: searchReducer});
export const store = configureStore({reducer: rootReducer,});

//import storage from 'redux-persist/lib/storage';
//import { persistReducer, persistStore } from 'redux-persist';
//const persistConfig = {key: 'root',storage,};
//const persistedReducer = persistReducer(persistConfig, rootReducer);
//export const store = configureStore({reducer: persistedReducer,});
//export const persistor = persistStore(store);
