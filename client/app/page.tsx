"use client";

import { useState, useEffect, useRef } from "react";
import Button from "@mui/material/Button";
import { TextField, CircularProgress } from "@mui/material";
import { googleAuthState } from "@/utils/enums";
import { type Issue } from "@/utils/enums";

export default function Home() {
  const [move, setMove] = useState(false);
  const [hideText, setHideText] = useState(false);
  const [hideSecondText, setSecondHideText] = useState(false);
  const [chnageMainBody, setChangeMainBody] = useState(true);
  const [googleAuthenticated, setGoogleAuthenticated] =
    useState<googleAuthState>(googleAuthState.Unknown);
  const hasMoved = useRef(false);
  const [otpSent, setOtpSent] = useState<googleAuthState>(
    googleAuthState.Unknown
  );
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneNumberError, setPhoneNumberError] = useState("");

  const [otpVerified, setOtpVerified] = useState<googleAuthState>(
    googleAuthState.Unknown
  );
  const [otpValue, setOtpValue] = useState("");
  const [otpErrors, setOtpErrors] = useState("");

  const hideTextStart = () => {
    if (!move) {
      setHideText(false);
    } else {
      setSecondHideText(false);
    }
  };

  // eslint-disable-next-line
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
    setTimeout(() => {
      setChangeMainBody((changeMainBodyFun) => !changeMainBodyFun);
    }, 400);
  };

  useEffect(() => {
    if (!hasMoved.current) {
      hasMoved.current = true;
      return;
    }

    hideTextStart();
    changeMainBodyFun();
    // eslint-disable-next-line
  }, [move]);

  useEffect(() => {
    setGoogleAuthenticated(googleAuthState.Unknown);
    const checkGoogleAuth = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_DOMAIN}/api/auth/frontend-status`,
          {
            credentials: "include",
          }
        );
        console.log(response.status);
        if (response.status == 200) {
          setGoogleAuthenticated(googleAuthState.Authenticated);
        } else {
          setGoogleAuthenticated(googleAuthState.Unauthenticated);
        }
      } catch (e) {
        console.log(e);
      }
    };
    const checkNumberAuth = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_DOMAIN}/api/auth/number-status`,
          {
            credentials: "include",
          }
        );
        console.log(response.status);
        if (response.status == 200) {
          setOtpSent(googleAuthState.Authenticated);
          setOtpVerified(googleAuthState.Authenticated);
        } else {
          setOtpSent(googleAuthState.Unknown);
          setOtpVerified(googleAuthState.Unknown);
        }
      } catch (e) {
        console.log(e);
      }
    };

    checkGoogleAuth();
    checkNumberAuth();
  }, []);

  const getOtp = async () => {
    setOtpSent(googleAuthState.Loading);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_DOMAIN}/api/auth/number`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ phoneNumber: phoneNumber }),
      }
    );
    const data = await response.json();
    if (response.status == 200) {
      console.log("sucessfull");
      setOtpSent(googleAuthState.Authenticated);
    } else {
      let str = "";
      data?.e?.issues.map((issue: Issue) => [(str += issue?.code + ", ")]);
      setPhoneNumberError(str);
      setOtpSent(googleAuthState.Unauthenticated);
    }
  };

  const verifyOtp = async () => {
    setOtpVerified(googleAuthState.Loading);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_DOMAIN}/api/auth/number/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ otp: otpValue }),
      }
    );
    const data = await response.json();
    if (response.status == 200) {
      console.log("sucessfull");
      setOtpVerified(googleAuthState.Authenticated);
    } else {
      console.log(data);
      let str = "";
      data?.e?.issues?.map((issue: Issue) => [(str += issue.code + ", ")]);
      if (data?.e?.issues == undefined) {
        str = "Wrong Otp";
      }
      setOtpErrors(str);
      setOtpVerified(googleAuthState.Unauthenticated);
    }
  };

  const reEnterOTP = async () => {
    setOtpErrors("");
    setPhoneNumberError("");
    setOtpSent(googleAuthState.Unauthenticated);
  };

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
          <div
            className={` ${
              googleAuthenticated == googleAuthState.Unauthenticated
                ? ""
                : "hidden"
            }`}
          >
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
              onClick={() =>
                (window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_DOMAIN}/api/auth/google`)
              }
            >
              <span className="text-[#4285F4]">G</span>
              <span className="text-[#EA4335]">o</span>
              <span className="text-[#FBBC05]">o</span>
              <span className="text-[#4285F4]">g</span>
              <span className="text-[#34A853]">l</span>
              <span className="text-[#EA4335]">e</span>{" "}
            </Button>
          </div>
          <div
            className={`flex gap-3 justify-items-center items-center text-3xl
            ${
              googleAuthenticated == googleAuthState.Authenticated
                ? ""
                : "hidden"
            }`}
          >
            <div>
              Your{" "}
              <span className="main-theme-fg justify-self-center w-fit">
                Google
              </span>{" "}
              Account is Authenticated{" "}
            </div>
            <div className=" rounded-full main-theme-bg w-11 transition-transform duration-1000 h-11 border-2">
              ✓
            </div>
          </div>
          <div
            className={`flex gap-3 ${
              googleAuthenticated == googleAuthState.Unknown ? "" : "hidden"
            }`}
          >
            <CircularProgress color="inherit" />
          </div>
        </div>

        {/* first half */}
        <div
          className={`${
            otpSent == googleAuthState.Authenticated ? "hidden" : ""
          }`}
        >
          <div
            className={`flex flex-col gap-5 ${chnageMainBody ? "hidden" : ""}
            ${
              googleAuthenticated == googleAuthState.Authenticated
                ? ""
                : "hidden"
            }`}
          >
            <TextField
              id="outlined-basic"
              label="Phone Number"
              variant="outlined"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "&.Mui-focused fieldset": {
                    borderColor: "#139a43",
                  },
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "#139a43",
                },
              }}
            />
            <div
              className={`text-[20px] text-red-500 ${
                otpSent == googleAuthState.Unauthenticated ? "" : "hidden"
              }`}
            >
              *Error {phoneNumberError}
            </div>
            <div
              className={` ${chnageMainBody ? "hidden" : ""} ${
                otpSent == googleAuthState.Loading ? "hidden" : ""
              }`}
            >
              <Button
                className=" self-center justify-self-center  h-20 "
                style={{
                  borderRadius: 10,
                  fontSize: "30px",
                  color: "#139a43",
                  border: "3px solid #139a43",
                  height: "60px",
                }}
                variant="outlined"
                onClick={getOtp}
              >
                Get OTP
              </Button>
            </div>
            <div
              className={`${
                otpSent == googleAuthState.Loading ? "" : "hidden"
              }`}
            >
              <CircularProgress color="inherit" />
            </div>
          </div>
        </div>

        {/* second half */}
        <div
          className={`${
            otpSent == googleAuthState.Authenticated ? "" : "hidden"
          }
          ${otpVerified == googleAuthState.Authenticated ? "hidden" : ""}`}
        >
          <div
            className={`flex flex-col gap-5 ${chnageMainBody ? "hidden" : ""}
            ${
              googleAuthenticated == googleAuthState.Authenticated
                ? ""
                : "hidden"
            }`}
          >
            <div className=" text-3xl">
              Entry the Otp Sent to{" "}
              <span className="main-theme-fg">{phoneNumber}</span>
            </div>

            <div>
              <TextField
                id="outlined-basic"
                label="OTP"
                variant="outlined"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "&.Mui-focused fieldset": {
                      borderColor: "#139a43",
                    },
                  },
                  "& .MuiInputLabel-root.Mui-focused": {
                    color: "#139a43",
                  },
                }}
              />
            </div>

            <div
              className={`text-[20px] text-red-500 ${
                otpVerified == googleAuthState.Unauthenticated ? "" : "hidden"
              }`}
            >
              *Error {otpErrors}
            </div>
            <div
              className={`${
                otpVerified == googleAuthState.Loading ? "hidden" : ""
              } `}
            >
              <Button
                className=" self-center justify-self-center  h-20 "
                style={{
                  borderRadius: 10,
                  fontSize: "30px",
                  color: "#139a43",
                  border: "3px solid #139a43",
                  height: "60px",
                }}
                variant="outlined"
                onClick={verifyOtp}
              >
                Verify Otp
              </Button>
            </div>
            <div
              className={`${
                otpVerified == googleAuthState.Loading ? "" : "hidden"
              }`}
            >
              <CircularProgress color="inherit" />
            </div>

            <div>
              <Button
                className=" self-center justify-self-center  h-20 "
                style={{
                  borderRadius: 10,
                  fontSize: "30px",
                  color: "#139a43",
                  border: "3px solid #139a43",
                  height: "60px",
                }}
                variant="outlined"
                onClick={reEnterOTP}
              >
                Re-Enter OTP
              </Button>
            </div>
          </div>
        </div>

        <div
          className={`flex text-3xl gap-3 items-center
          ${chnageMainBody ? "hidden" : ""}
          ${otpVerified == googleAuthState.Authenticated ? "" : "hidden"}  `}
        >
          {" "}
          <div>
            Your{" "}
            <span className="main-theme-fg justify-self-center w-fit">
              Phone Number
            </span>{" "}
            Account is Authenticated{" "}
          </div>
          <div className=" rounded-full main-theme-bg w-11 transition-transform duration-1000 h-11 border-2">
            ✓
          </div>
        </div>

        <div
          className={` text-red-500 ${chnageMainBody ? "hidden" : ""} 
          ${
            googleAuthenticated == googleAuthState.Unauthenticated
              ? ""
              : "hidden"
          }`}
        >
          Please verify your Google Account before Phone Number
        </div>
      </div>
    </div>
  );
}
