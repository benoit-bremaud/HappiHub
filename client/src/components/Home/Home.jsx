import "./home.css";
import { Agenda } from "../../events/Agenda";

/** Home: one muted tagline, then the agenda first (agenda visual design D7, V1). */
export const Home = () => (
  <div className="home">
    <p className="home__tagline">Culture, sharing and community through events.</p>
    <Agenda />
  </div>
);
