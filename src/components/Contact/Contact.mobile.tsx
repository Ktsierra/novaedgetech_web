import useCamera from "../../hooks/useCamera";
import { contact } from "./contactText";
import ContactForm from "./ContactForm";
import "./Contact.mobile.css";
import BottomSheet from "../BottomSheet";

const ContactMobile = () => {
  const { setStarSelected } = useCamera();

  return (
    <BottomSheet>
      <div className="top-bar">
        <h2 className="title">{contact.header.title}</h2>
        <button onClick={() => { setStarSelected(false); }} className="back-button">
          {contact.header.backButtonText}
        </button>
      </div>
      <ContactForm />
      <div className="footer-interface">
        <div className="footer-line">{contact.footer.footerLine}</div>
        <div className="pulse-indicator"></div>
      </div>
    </BottomSheet>
  );
};

export default ContactMobile;
