import React from "react";
import './InfoPage.css'; // Importing the CSS file for styles

class InfoPage extends React.Component {
    constructor(props) {
      super(props)
    }
  
    render() {
      const { count, increment, decrement } = this.props;
        return <>
        <div className="scroll-container">
        <div className="scroll-content">
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus
            imperdiet velit nec magna viverra, at accumsan arcu luctus. Integer
            vel felis et eros tincidunt tincidunt. Etiam auctor lorem ut mi
            fermentum, ut interdum purus posuere.
          </p>
          <p>
            Suspendisse potenti. Pellentesque habitant morbi tristique senectus et
            netus et malesuada fames ac turpis egestas. Phasellus non scelerisque
            ligula. Donec lacinia fermentum lorem sit amet vehicula.
          </p>
  
          {/* Wrap the images in a div */}
          <div className="image-container">
            <img src="https://via.placeholder.com/300x200" alt="Placeholder" />
          </div>
  
          <p>
            Praesent condimentum sapien magna, in vestibulum massa vulputate et.
            Integer suscipit sollicitudin metus, ut mollis odio vestibulum vel.
            Fusce accumsan enim eu velit varius malesuada. Aenean varius quam
            velit, a feugiat metus fermentum non.
          </p>
  
          <div className="image-container">
            <img src="https://via.placeholder.com/300x200" alt="Placeholder" />
          </div>
  
          <p>
            Nullam ut dictum magna, non sodales purus. Suspendisse potenti. In non
            dui eget elit malesuada congue non in massa.
          </p>
        </div>
      </div></>
    }
  }
export default InfoPage;