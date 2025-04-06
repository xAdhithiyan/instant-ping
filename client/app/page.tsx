"use client";

import { useState, useEffect } from "react";
import Button from "@mui/material/Button";
import { TextField } from "@mui/material";

export default function Home() {
  const [move, setMove] = useState(false);
  const [hideText, setHideText] = useState(false);
  const [hideSecondText, setSecondHideText] = useState(false);
  const [chnageMainBody, setChangeMainBody] = useState(false);

  const hideTextStart = () => {
    if (!move) {
      setHideText(false);
    } else {
      setSecondHideText(false);
    }
  };

  const hideTextEnd = (e: any) => {
    if (e.propertyName == "translate") {
      if (move) {
        setHideText(true);
      } else {
        setSecondHideText(true);
      }
    }
  };

  const changeMainBodyFun = () => {
    console.log("change");
    setTimeout(() => {
      setChangeMainBody((changeMainBodyFun) => !changeMainBodyFun);
    }, 400);
  };

  useEffect(() => {
    hideTextStart();
    changeMainBodyFun();
  }, [move]);

  return (
    <div className="grid grid-cols-[350px_1fr] grid-flow-col bg-white ">
      <div
        className={` text-white fixed top-32 w-[350px] p-4 pr-8 pl-8 text-center text-2xl transition-transform duration-1000 z-10 
         ${move ? "translate-x-[calc(10vw)]" : "translate-x-0"}
         ${hideText ? "hidden" : ""}`}
      >
        If you have finished Google authentication, proceed to phone number
        verification.
      </div>
      <div
        className={` text-white fixed top-32 right-0 w-[350px] p-4 pr-8 pl-8 text-center text-2xl transition-transform duration-1000 z-10 
          ${move ? "translate-x-0 " : "-translate-x-[calc(10vw)]"}
          ${hideSecondText ? "hidden" : ""}`}
      >
        Go back to Google authentication.
      </div>
      <div
        onTransitionEnd={(e) => hideTextEnd(e)}
        className={`main-theme-bg  h-screen w-[350px] border-3 grid text-2xl transition-transform duration-1000 ease ${
          move ? "translate-x-[calc(100vw-350px)]" : "translate-x-0"
        }`}
      >
        <div></div>
        <Button
          className=" self-center justify-self-center w-40 h-20 "
          style={{
            borderRadius: 10,
            fontSize: "18px",
            color: "white",
            borderColor: "white",
            borderWidth: "3px",
          }}
          variant="outlined"
          onClick={() => setMove((move) => !move)}
        >
          Go
        </Button>
      </div>
      <div
        className={`bg-white z-30 text-shadow-lg/20 shadow-[inset_0_0_500px_rgba(0,0,0,0.6)] w-full h-screen flex flex-col justify-center items-center gap-10 text-4xl text-center transition-transform duration-1000 ease 
          ${move ? "-translate-x-[350px]" : "translate-x-0"}
         `}
      >
        <div className="text-5xl bg-asd main-theme-fg font-extrabold">
          Instant Ping
        </div>
        <div className="w-1/2">
          Stay in the loop — get your emails delivered right to your{" "}
          <span className=" leading-loose p-1 rounded-2xl main-theme-fg font-extrabold">
            WhatsApp
          </span>
          .
        </div>
        <div className={` ${!chnageMainBody ? "hidden" : ""}`}>
          Get started with{" "}
          <Button
            className=" self-center justify-self-center w-40 h-20 "
            style={{
              borderRadius: 10,
              fontSize: "30px",
              color: "#139a43",
              border: "3px solid #139a43",
              height: "60px",
            }}
            variant="outlined"
          >
            <span className="text-[#4285F4]">G</span>
            <span className="text-[#EA4335]">o</span>
            <span className="text-[#FBBC05]">o</span>
            <span className="text-[#4285F4]">g</span>
            <span className="text-[#34A853]">l</span>
            <span className="text-[#EA4335]">e</span>{" "}
          </Button>
        </div>
        <div className={` ${chnageMainBody ? "hidden" : ""}`}>
          <TextField
            id="outlined-basic"
            label="Phone Number"
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                "&.Mui-focused fieldset": {
                  borderColor: "#139a43", // outline color when focused
                },
              },
              "& .MuiInputLabel-root.Mui-focused": {
                color: "#139a43", // label color when focused
              },
            }}
          />
        </div>
        <div className={` ${chnageMainBody ? "hidden" : ""}`}>
          Verify <button> Mobile Number</button>
        </div>
        <div className={` ${chnageMainBody ? "hidden" : ""}`}></div>
      </div>
    </div>
  );
}
