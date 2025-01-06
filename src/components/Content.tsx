import './Content.css';

const Content: React.FC = () => {
  return (
    <div className="content">
      <section id='our-projects' className="our-projects">
        <h2>Our Projects</h2>
        <p>Placeholder for the description of our projects.</p>
      </section>

      <section id='what-we-offer' className="what-we-offer">
        <h2>What We Offer</h2>
        <p>Placeholder for the description of what we offer to our clients.</p>
      </section>

      <section id='our-apps' className="our-apps">
        <h2>Our Apps</h2>
        <p>Placeholder for the description of our apps.</p>
      </section>

      <section id='our-skills' className="our-skills">
        <h2>Our Skills</h2>
        <p>Placeholder for the description of our skills as developers.</p>
      </section>
    </div>
  );
};

export default Content;