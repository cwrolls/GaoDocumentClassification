// src/SignIn.js
import React from 'react';
import { signInWithPopup, signInWithRedirect } from "firebase/auth";
import { auth, provider } from "../firebase";
import { Button } from 'primereact/button';
import GoogleIcon from '@mui/icons-material/Google';
import './SignIn.css';

const SignIn = () => {
  const signInWithGoogle = () => {
    signInWithPopup(auth, provider);
  };

  return (
    <div className="flex mt-2 mr-10 justify-self-end">
      <Button label="Sign In With Google" onClick={signInWithGoogle} 
      icon={(options) => <GoogleIcon {...options.iconProps} />} className="sign-in-button fill-s"
      pt={{
        icon: {className: 'ml-3'},
      }}/>
    </div>
  );
};

export default SignIn;