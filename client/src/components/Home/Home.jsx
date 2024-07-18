import React from "react";
import "./home.css";
import { useNavigate } from "react-router-dom";
import Card from "../Card/Card";
import PropTypes from "prop-types";

// Sample event data
const events = [
  {
    id: 1,
    title: "Concert in the Park",
    date: "2024-07-20",
    description: "Enjoy live music at the park with friends and family.",
    image: "concert.jpg",
  },
  {
    id: 2,
    title: "Art Exhibition",
    date: "2024-08-05",
    description: "Explore contemporary art from local artists.",
    image: "art_exhibition.jpg",
  },{
    id: 3,
    title: "Food Festival",
    date: "2024-09-12",
    description: "Taste the best dishes from around the world.",
    image: "food_festival.jpg",
    location: "Downtown",
  },
  {
    id: 4,
    title: "Tech Conference",
    date: "2024-10-22",
    description: "Join the latest discussions in technology and innovation.",
    image: "tech_conference.jpg",
    location: "Convention Center",
  },
  {
    id: 5,
    title: "Marathon",
    date: "2024-11-05",
    description: "Run with thousands of participants in our annual marathon.",
    image: "marathon.jpg",
    location: "City Streets",
  },
  {
    id: 6,
    title: "Book Fair",
    date: "2024-12-01",
    description: "Discover new books and meet your favorite authors.",
    image: "book_fair.jpg",
    location: "Exhibition Hall",
  },
  {
    id: 7,
    title: "Film Festival",
    date: "2025-01-15",
    description: "Watch premieres of the latest indie films.",
    image: "film_festival.jpg",
    location: "Cinema Plaza",
  },
  {
    id: 8,
    title: "Yoga Retreat",
    date: "2025-02-20",
    description: "Relax and rejuvenate with our weekend yoga retreat.",
    image: "yoga_retreat.jpg",
    location: "Mountain Resort",
  },
  {
    id: 9,
    title: "Charity Gala",
    date: "2025-03-10",
    description: "Attend our annual gala to support local charities.",
    image: "charity_gala.jpg",
    location: "Grand Hotel",
  },
  {
    id: 10,
    title: "Gardening Workshop",
    date: "2025-04-05",
    description: "Learn how to grow your own garden.",
    image: "gardening_workshop.jpg",
    location: "Community Center",
  },
  // Add more events as needed
];

const Home = ({ user }) => {

  const navigate = useNavigate();

  const handleCardClick = (event) => {
    if (user) {
      navigate(`/event/${event.id}`);
    } else {
      navigate("/login", { state: { from: { pathname: `/event/${event.id}` } } });
    }
  };
  return (
    <div className="home">
      <h1>Bienvenue, {user ? user.name : "Visiteur"} !</h1>
      <div className="card_display">
        {events.map((event) => (
          <Card key={event.id} event={event} onClick={handleCardClick} />
        ))}
      </div>
    </div>
  );
};

Home.propTypes = {
  user: PropTypes.object,
};

export default Home;
