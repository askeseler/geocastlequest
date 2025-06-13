import React from "react";
import './InfoPage.css'; // Importing the CSS file for styles

class InfoPage extends React.Component {
  constructor(props) {
    super(props);
    this.getLocation = this.getLocation.bind(this);
  }

  getLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this.onPositionUpdate,
        this.onError
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  onPositionUpdate(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    alert(`Current position: ${lat}, ${lng}`);
  }

  onError(error) {
    alert(`Error getting location: ${error.message}`);
  }

  render() {
    const { count, increment, decrement } = this.props;

    return (
      <>
        <div className="scroll-container">
          <div className="scroll-content">
            <button onClick={this.getLocation}>
              Get Current Position
            </button>

            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus
              imperdiet velit nec magna viverra, at accumsan arcu luctus.
            </p>

            <p>
              Suspendisse potenti. Pellentesque habitant morbi tristique senectus et
              netus et malesuada fames ac turpis egestas.
            </p>

            <div className="image-container">
              <img src="https://via.placeholder.com/300x200" alt="Placeholder" />
            </div>

            <p>
              Praesent condimentum sapien magna, in vestibulum massa vulputate et.
            </p>

            <div className="image-container">
              <img src="https://via.placeholder.com/300x200" alt="Placeholder" />
            </div>

            <p>
              Nullam ut dictum magna, non sodales purus. Suspendisse potenti.
            </p>
          </div>
        </div>
      </>
    );
  }
}

export default InfoPage;
