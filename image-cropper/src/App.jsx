import { Routes, Route, Navigate, Router } from "react-router-dom";
import "./App.css";
import Homepage from "./pages/Homepage";

function App() {
  return (
    <>
      <Routes>
        <Route path="/Image Cropper" element={<Homepage />} />
        <Route path="*" element={<Navigate to="/Image Cropper" />} />
      </Routes>
    </>
  );
}

export default App;
