import React, { createRef } from "react";
import './Registration.css'; // Importing the CSS file for styles

class Registration extends React.Component {
  constructor(props) {
    super(props);

    // Refs for form fields
    this.emailRef = createRef();
    this.nameRef = createRef();
    this.passwordRef = createRef();
    this.passwordRepeatRef = createRef();

    // State to store email and success message
    this.state = {
      email: "",
      user_has_token: 0,
      successMsg: "", // This will hold the success or error message
    };

    this.url = window.api + "/user/change_password";
  }

  // Function to validate password
  validatePassword(pw) {
    return (
      /[A-Z]/.test(pw) &&
      /[a-z]/.test(pw) &&
      /[0-9]/.test(pw) &&
      /[^A-Za-z0-9]/.test(pw) &&
      pw.length > 8
    );
  }

  // Function to update the password
  updatePassword = async (event) => {
    event.preventDefault();

    const pwd = this.passwordRef.current.value;
    const pwdRepeat = this.passwordRepeatRef.current.value;

    if (pwd === pwdRepeat) {
      if (this.validatePassword(pwd)) {
        const body = {
          password: pwd,
          email: this.state.email, // Using the state to retrieve the email
        };
        try {
          const res = await fetch(this.url, {
            method: "POST",
            body: JSON.stringify(body),
            headers: {
              "content-type": "application/json",
            },
          });
          const success = await res.json();
          // Update the successMsg with the response message
          this.setState({ successMsg: "Registration completed successfully!" });
        } catch (error) {
          this.setState({ successMsg: "Failed to complete registration. Please try again." });
        }
      } else {
        this.setState({
          successMsg:
            "Password must meet the following conditions: at least one uppercase letter, one lowercase letter, one digit, one special symbol, and at least 8 characters long.",
        });
      }
    } else {
      this.setState({ successMsg: "Passwords do not match." });
    }
  };

  // Function to retrieve email
  retrieveMail = async () => {
    const response = await fetch(window.api + "/user/details");
    const user_details = await response.json();
    this.setState({ email: user_details["email"] });
  };

  // Lifecycle method to fetch email once component mounts
  componentDidMount() {
    this.retrieveMail();
  }

  render() {
    return (
      <div className="scroll-container">
        <div className="scroll-content">
          <h1>Registration</h1>
          <p>
            To finish your registration, fill in the information as indicated
            below. Required fields are marked with an asterisk.
          </p>

          <form onSubmit={this.updatePassword}>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                name="email"
                defaultValue={this.state.email}
                ref={this.emailRef}
                className="input-field"
                readOnly
              />
            </div>

            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                name="password"
                ref={this.passwordRef}
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label>Repeat Password:</label>
              <input
                type="password"
                name="passwordRepeat"
                ref={this.passwordRepeatRef}
                className="input-field"
                required
              />
            </div>

            <button type="submit" className="submit-button">
              Finish Registration
            </button>
          </form>

          {/* Display success or error message */}
          <p className="response-text">{this.state.successMsg}</p>
        </div>
      </div>
    );
  }
}

export default Registration;
