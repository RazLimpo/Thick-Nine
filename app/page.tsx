import "@/styles/pages/index.css";
import "@/styles/pages/service-card.css";


import HeroSection 
from "@/components/HeroSection/HeroSection";


import ServiceGrid 
from "@/components/ServiceGrid/ServiceGrid";


import CategorySidebar 
from "@/components/CategorySidebar/CategorySidebar";

import TrendingWidget 
from "@/components/TrendingWidget/TrendingWidget";

import ValueSection 
from "@/components/ValueSection/ValueSection";



export default function HomePage(){


return(


<main>


<HeroSection />



<section className="featured-services-section">


<div className="container">



<div className="homepage-flex-wrapper">



<ServiceGrid />



<CategorySidebar />



</div>



</div>



</section>

<ValueSection />


</main>


);


}