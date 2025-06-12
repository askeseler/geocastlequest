// src/App.js
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
// src/App.js
import {updateLatitude,incrementLongitude,decrementLongitude,toggleCheckbox,updateInputField,
} from '../redux/FormSlice';


const FormPage = ({latitude, longitude, checkbox, inputField, updateLatitude, incrementLongitude,decrementLongitude,toggleCheckbox, updateInputField,}) => {

  return (
    <div className="scroll-container">
      <div className="scroll-content">
      <h2>Redux Form with Persisted State</h2>
      <div>
        <label>Latitude: {latitude}</label>
        <input
          type="range"
          min="-90"
          max="90"
          value={latitude}
          onChange={(e) => updateLatitude(Number(e.target.value))}
        />
      </div>
      <div>
        <label>Longitude: {longitude}</label>
        <button onClick={incrementLongitude}>Increment Longitude</button>
        <button onClick={decrementLongitude}>Decrement Longitude</button>
      </div>
      <div>
        <label>
          <input
            type="checkbox"
            checked={checkbox}
            onChange={toggleCheckbox}
          />
          Checkbox
        </label>
      </div>
      <div>
        <label>Input Field: {inputField}</label>
        <input
          type="text"
          value={inputField}
          onChange={(e) => updateInputField(e.target.value)}
        />
      </div>
      </div>
    </div>
  );
};

// Adding PropTypes for better validation
FormPage.propTypes = {
  latitude: PropTypes.number.isRequired,
  longitude: PropTypes.number.isRequired,
  checkbox: PropTypes.bool.isRequired,
  inputField: PropTypes.string.isRequired,
  updateLatitude: PropTypes.func.isRequired,
  incrementLongitude: PropTypes.func.isRequired,
  decrementLongitude: PropTypes.func.isRequired,
  toggleCheckbox: PropTypes.func.isRequired,
  updateInputField: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({latitude: state.form.latitude, longitude: state.form.longitude,
    checkbox: state.form.checkbox, inputField: state.form.inputField,});
  const mapDispatchToProps = {updateLatitude,incrementLongitude,decrementLongitude,toggleCheckbox,updateInputField,};
  
  export default connect(mapStateToProps, mapDispatchToProps)(FormPage);
