import useCamera from "../../hooks/useCamera";
import SidePanel from "../SidePanel";
import { contact } from "./contactText";
import ContactForm from "./ContactForm";
import "./Contact.desktop.css";

const ContactDesktop = () => {
  const { setStarSelected } = useCamera();

  return (
    <SidePanel
      styles={{
        left: "0",
        right: "0",
        top: "10%",
        width: "50%",
        maxHeight: "80vh",
        margin: "0 auto",
        overflow: "auto",
        maxWidth: "800px",
        minWidth: "600px",
      }}
      transitionFrom={{ x: "0", y: "-100vh" }}
    >
      <div className="top-bar">
        <h2 className="title">{contact.header.title}</h2>
        <button onClick={() => { setStarSelected(false); }} className="back-button">
          {contact.header.backButtonText}
        </button>
      </div>
      <ContactForm />
      <div className="footer-interface">
        <div className="pulse-indicator"></div>
        <div>{contact.footer.footerLine}</div>
      </div>
    </SidePanel>
  );
};

export default ContactDesktop;
