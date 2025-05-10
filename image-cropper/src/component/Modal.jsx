import { useContext, useRef, useState } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import imageContext from "../store/image-context";

function Prompt(props) {
  const [show, setShow] = useState(true);
  const [state, setState] = useState(true);
  const inputRef = useRef();
  const imgCtx = useContext(imageContext);
  const handleClose = () => setShow(false);
  // Function to show the modal
  const handleShow = () => {
    setShow(true);
    if (props.onShow) {
      props.onShow(); // Execute the parent's show function if provided
    }
  };
  const handleSave = () => {
    const enteredPath = inputRef.current.value;
    imgCtx.addToPath(enteredPath);
    setShow(false);
  };
  const handleChange = () => {
    if (inputRef.current.value) {
      setState(false);
    } else {
      setState(true);
    }
  };

//   const waitForClose = () => {
//     return new Promise((resolve) => {
//       handleClose = () => {
//         const enteredPath = inputRef.current.value;
//         // setShow(false);
//         resolve(enteredPath); // Resolve the promise with entered path
//       };
//     });
//   };
  return (
    <>
      <Modal
        show={show}
        onHide={handleClose}
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header>
          <Modal.Title>Enter the folder path :- </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input
            type="text"
            placeholder="Enter folder path here"
            ref={inputRef}
            style={{ width: "100%", padding: "10px", borderRadius: "5px" }}
            onChange={handleChange}
          />
        </Modal.Body>
        <Modal.Footer>
          {/* <Button variant="secondary" onClick={handleClose}>
            Close
          </Button> */}

          <Button
            variant="primary"
            disabled={state}
            onClick={handleSave}
            style={{ width: "100%" }}
          >
            Save Location
          </Button>
          {/* <Button variant="primary">Understood</Button> */}
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default Prompt;
