'use client';


import { useState } from "react";

import ServiceCard from "@/components/ServiceCard/ServiceCard";



interface Service {

  id:number;

  title:string;

  seller:string;

  location:string;

  price:string;

  rating:string;

  delivery:string;

  level:string;

  category:string;

  avatar:string;

  images:string[];

}



const services:Service[] = [


  {
    id:1,

    title:
    "I will design a modern minimalist logo for your startup",

    seller:"Alex Morgan",

    location:"Lagos, NG",

    price:"$25",

    rating:"4.9",

    delivery:"3 Days",

    level:"Basic",

    category:"Design",

    avatar:
    "https://i.pravatar.cc/150?u=male1",

    images:[

      "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=400",

      "https://images.unsplash.com/photo-1627163430034-453f65675e2f?q=80&w=400",

      "https://images.unsplash.com/photo-1627384113710-89b5314a43b7?q=80&w=400"

    ]

  },

];





export default function ServiceGrid(){



const [currentPage,setCurrentPage]=useState(1);



const cardsPerPage = 20;



const totalPages =
Math.ceil(
services.length / cardsPerPage
);



const start =
(currentPage - 1) * cardsPerPage;



const end =
start + cardsPerPage;



const visibleServices =
services.slice(start,end);





function scrollToServices(){


window.scrollTo({

top:0,

behavior:"smooth"

});


}





return(


<div className="services-main-col">

<h2 className="section-title-homepage">

Featured Services for Your Project

</h2>



<p className="section-subtitle-homepage">

Hand-picked gigs from our top-rated professionals.

</p>






<div

className="mjob-container"

id="homepage-service-grid"

>



{

visibleServices.map(service=>(


<ServiceCard

key={service.id}

{...service}

/>


))


}





</div>







<div className="pagination-container">



<div className="pagination-wrapper">





<a

href="#"

className="page-arrow prev"

onClick={(e)=>{


e.preventDefault();


if(currentPage>1){

setCurrentPage(currentPage-1);

scrollToServices();

}


}}

>

<i className="fas fa-chevron-left"/>

Previous

</a>






<div

className="page-numbers"

id="home-page-numbers"

>



{

Array.from(
{length:totalPages}
).map((_,index)=>{


const page=index+1;


return(


<a

href="#"

key={page}

className={

page===currentPage

?

"page-link active"

:

"page-link"

}


onClick={(e)=>{


e.preventDefault();


setCurrentPage(page);

scrollToServices();


}}


>

{page}


</a>


)


})


}



</div>







<a

href="#"

className="page-arrow next"

onClick={(e)=>{


e.preventDefault();



if(currentPage<totalPages){


setCurrentPage(currentPage+1);


scrollToServices();


}


}}

>


Next

<i className="fas fa-chevron-right"/>


</a>






</div>


</div>







<div className="view-all-button-wrapper">


<a

href="/search-results"

className="btn-secondary view-all-btn"

>

Browse All Services

</a>


</div>


</div>


)


}