'use client';


import { useState } from "react";

import Link from "next/link";


interface ServiceCardProps {

  title: string;

  seller: string;

  location: string;

  price: string;

  rating: string;

  delivery: string;

  level: string;

  category: string;

  images: string[];

  avatar: string;

}



export default function ServiceCard({
  title,
  seller,
  location,
  price,
  rating,
  delivery,
  level,
  category,
  images,
  avatar,

}: ServiceCardProps) {


  const [activeImage, setActiveImage] = useState(0);

  const [favorite, setFavorite] = useState(false);



  return (


    <div className="mjob-card status-online">



      <div className="mjob-visual-header">


        <div className="mjob-slider-wrapper">


          {images.map((image,index)=>(


            <div

              key={image}

              className="mjob-slide"

              onClick={() =>
                setActiveImage(index)
              }

              style={{

                backgroundImage:
                `url(${image})`,

                display:
                index === activeImage
                ? "block"
                : "none"

              }}

            />


          ))}


        </div>





        <div className="mjob-slider-dots">


          {images.map((_,index)=>(


            <span

              key={index}

              className={
                index === activeImage
                ? "dot active"
                : "dot"
              }


              onClick={() =>
                setActiveImage(index)
              }


            />


          ))}


        </div>






        <div className="mjob-profile-box">


          <img
            src={avatar}
            alt={seller}
          />


          <span className="mjob-status-badge" />


        </div>





        <div className="mjob-status-icons">


          <span
            className="m-status-circle sponsored-icon"
            data-tooltip="Top Rated: High Sales Volume"
          >

            <i className="fas fa-crown" />

          </span>



          <span
            className="m-status-circle featured-icon"
            data-tooltip="Trending: High Recent Views"
          >

            <i className="fas fa-fire" />

          </span>


        </div>






        <button

          className="mjob-favorite"

          onClick={() =>
            setFavorite(!favorite)
          }

          aria-label="Favorite service"

        >


          <i

            className={
              favorite
              ? "fas fa-heart"
              : "far fa-heart"
            }

          />


        </button>






        <span className="mjob-category-tag">

          {category}

        </span>



      </div>


<Link href="/service-details" className="mjob-card-link">
        <div className="mjob-content-area">

          <div className="mjob-stats-row">
            <div className="stat-item">
              <i className="fas fa-star" />
              {rating}
            </div>

            <div className="stat-item">
              <i className="fas fa-clock icon-muted" />
              {delivery}
            </div>

            <div className="stat-item">
              <i className="fas fa-award icon-muted" />
              {level}
            </div>
          </div>

          <h3 className="mjob-title">{title}</h3>

          <div className="mjob-user-meta">
            <span className="mjob-username">
              <i className="fas fa-user m-icon" />
              {seller}
            </span>

            <span className="mjob-location">
              <i className="fas fa-map-marker-alt" />
              {location}
            </span>
          </div>

          <div className="mjob-footer-price">
            <span className="mjob-level">{level}</span>
            <span className="mjob-price">{price}</span>
          </div>

        </div>
      </Link>



    </div>


  );

}