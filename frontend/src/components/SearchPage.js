// src/pages/SearchPage.js
import React from "react";
import './InfoPage.css';
import { useDispatch, useSelector } from 'react-redux';
import { setAttr } from '../redux/SearchSlice'; // adjust path if needed

const SearchPage = () => {
  const dispatch = useDispatch();
  const msg = useSelector((state) => state.search.msg); // <-- Redux state

  const setRandomMessage = () => {
    const randomMessage = Math.random().toString(36).substring(2, 10);
    dispatch(setAttr({ msg: randomMessage }));
  };

  return (
    <div className="scroll-container">
      <div className="scroll-content">
        <p>Search Page.</p>
        <button onClick={setRandomMessage}>Set Message</button>
        <p>Message: {msg}</p>
      </div>
    </div>
  );
};

export default SearchPage;
