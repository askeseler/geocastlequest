import './Login.css';
import { useRef, useState, useEffect } from "react";
import ReCAPTCHA from 'react-google-recaptcha'
let REACT_APP_SITE_KEY = process.env.REACT_APP_SITE_KEY;// Must be defined as an environment variable
let DEBUG = true;

const LoginImage = ({ userIcon, loginOpen, setLoginOpen, setLoggedIn}) => {
  const recaptcha = useRef();
  const [email, setEmail] = useState("");
  const [loginOrSignup, setLoginOrSignup] = useState("login");
  const [pwd, setPwd] = useState("");
  const [sucessMsgSignUp, setSuccessMsgSignUp] = useState("");
  const [sucessMsgLogIn, setSucessMsgLogIn] = useState("");
  const [msgBoxOpen, setMsgBoxOpen] = useState(false);
  const loginBoxRef = useRef(null); // Create a reference
  const msgBoxRef = useRef(null); // Create a reference

  let redirect_location = "";
  let signup_url = window.api + "/user/send_sign_up_mail";
  let login_url = window.api + "/user/login";

  async function sendRegistrationLink(event) {
    event.preventDefault();
    let captchaValue;
    if(!DEBUG)captchaValue = recaptcha.current.getValue();
    //console.log(JSON.stringify({ captchaValue }));
    if (!captchaValue  && !DEBUG) {
      setSuccessMsgSignUp("Please verify the reCAPTCHA!");
    } else {
      console.log("verifying via backend")
      let body = { captchaValue };
      body["email"] = email;
      const res = await fetch(signup_url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "content-type": "application/json",
        },
      });
      const success = await res.json();
        if (res.status === 401)setSucessMsgLogIn("Invalid credentials!");
        else if (res.status === 429)setSucessMsgLogIn("reCAPTCHA validation failed!");
        else if (res.status === 200)setSuccessMsgSignUp("A Mail was sent to your address. Check the inbox and follow the instructions to complete the registration.");
        else setSucessMsgLogIn("Unexpected return value");
    }
  }

  async function sendLogin(event) {
    event.preventDefault();
    let captchaValue;
    if(!DEBUG)captchaValue = recaptcha.current.getValue();
    if (!captchaValue && !DEBUG) {
      sucessMsgLogIn("Please verify the reCAPTCHA!");
    } else {
      let body = { captchaValue };
      body["email"] = email;
      body['password'] = pwd;
      const res = await fetch(login_url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "content-type": "application/json",
        },
      });
      if (res.status === 401)setSucessMsgLogIn("Invalid credentials!")
      else if (res.status === 429)setSucessMsgLogIn("reCAPTCHA validation failed!")
      else if (res.status === 200){
        setLoginOpen(false);
        setMsgBoxOpen(true);
        setLoggedIn(true);
    }
      else setSucessMsgLogIn("Unexpected return value");
    } 
  }

  const handleImageClick = () => {
    setLoginOpen(true);
  };

  const handleOverlayClickLogin = (event) => {
    if (event.target !== loginBoxRef.current && !loginBoxRef.current.contains(event.target)) {
      setLoginOpen(false);
    }
  };

  const handleOverlayClickMsgBox = (event) => {
    if (event.target !== msgBoxRef.current && !msgBoxRef.current.contains(event.target)) {
      setMsgBoxOpen(false);
    }
  };

  return (
  <div>
  <img
    src={userIcon}
    alt="User Icon"
    className="clickable-image"
    onClick={handleImageClick}
    style={{ width: "75px", height: "75px" }}
  />

  {msgBoxOpen && (
    <div className="overlay" onClick={handleOverlayClickMsgBox}>
        <div className="centered-foreground-box" ref={msgBoxRef}>
             You have logged in successfully.
        </div>
    </div>
  )

  }

  {loginOpen && (
    <div className="overlay" onClick={handleOverlayClickLogin}>
      <form onSubmit={loginOrSignup === "login"?sendLogin:sendRegistrationLink}>
        <div className="centered-foreground-box" ref={loginBoxRef}>
        <h2>Login</h2>
          <input
            className="input-field"
            type="email"
            value={email}
            required
            placeholder="joe@example.com"
            onChange={(event) => setEmail(event.target.value)}
          />
          {loginOrSignup=="login"?
          <input
            className="input-field"
            type="password"
            required
            onChange={(event) => setPwd(event.target.value)}
          />:<div/>
          }

        {!DEBUG ? <ReCAPTCHA ref={recaptcha} sitekey={REACT_APP_SITE_KEY} />:<div/>}

        <button className="login-button">{loginOrSignup==="login"?"Login":"Sign Up"}</button>
        <div className='response-text'>{sucessMsgSignUp}</div>
        <div
            className="sign-up-or-login"
            onClick={() =>
              setLoginOrSignup(loginOrSignup === "login" ? "signUp" : "login")
            }
          >
            {loginOrSignup === "login" ? "Sign up" : "Login"}
      </div>
        </div>
      </form>
    </div>
  )}
</div>

  );
};

export default LoginImage;

/*
function LoginPage({ loginOpen, closeLogin, loginOrSignUp }){
  if (loginOpen && loginOrSignUp==="sign_up"){
  return (
    <div style={login_style}>
    <div style={{transform:"translateY(10%)", paddingLeft: "10vh", paddingRight: "10vh", paddingBottom: "10vh"}}>
      <h1>Sign up via email</h1>
      <div onClick={()=>closeLogin()} style={{color:"red", position:"relative", transform: "translate(93%, -320%)", cursor:"pointer"}}>❌</div>
      <form onSubmit={sendRegistrationLink}>
        <input
          name="Email"
          type={"email"}
          value={email}
          required
          placeholder="joe@example.com"
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          name="Name"
          type={"name"}
          value={name}
          required
          placeholder="Joe"
          onChange={(event) => setName(event.target.value)}
        />
        <button type="submit">Sign up</button>
      </form>
    </div>
  </div>
  )}
  
  if (loginOpen && loginOrSignUp==="log_in"){
    return (
      <div style={login_style}>
      <div style={{transform:"translateY(10%)", paddingLeft: "10vh", paddingRight: "10vh", paddingBottom: "10vh"}}>
        <h1>Log in to your account</h1>
        <div onClick={()=>closeLogin()} style={{color:"red", position:"relative", transform: "translate(93%, -320%)", cursor:"pointer"}}>❌</div>
        <form onSubmit={sendLogin}>
          <input
            name="Email"
            type={"email"}
            value={email}
            required
            placeholder="joe@example.com"
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            name="Name"
            type="password"
            required
            onChange={(event) => setPwd(event.target.value)}
          />
          <button type="submit">Login</button>
          <ReCAPTCHA ref={recaptcha} sitekey={REACT_APP_SITE_KEY} />
          <div>{sucessMsgLogIn}</div>
        </form>
      </div>
    </div>
    )}
  else return <></>;
};

export default LoginPage;
*/


