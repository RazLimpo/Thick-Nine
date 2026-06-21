import Image from "next/image";
import Link from "next/link";

import TrendingWidget 
from "@/components/TrendingWidget/TrendingWidget";




interface Category {


  name:string;

  label:string;

  image:string;

  className:string;

}





const categories:Category[] = [


  {
    name:"Miscellaneous",

    label:"General",

    image:"/watch.png",

    className:"bg-misc"

  },


  {
    name:"Travelling",

    label:"Explore",

    image:"/travelling.png",

    className:"bg-travelling"

  },


  {
    name:"Video",

    label:"Motion",

    image:"/watch.png",

    className:"bg-video"

  },


  {
    name:"Lifestyle",

    label:"Lifestyle",

    image:"/watch.png",

    className:"bg-lifestyle"

  },


  {
    name:"Programming",

    label:"Solutions",

    image:"/watch.png",

    className:"bg-programming"

  },


  {
    name:"Graphics",

    label:"Creative",

    image:"/watch.png",

    className:"bg-graphics"

  },


  {
    name:"Writing",

    label:"Contents",

    image:"/dig4.png",

    className:"bg-writing"

  },


  {
    name:"Music-and-Audio",

    label:"Acoustic",

    image:"/music.png",

    className:"bg-music"

  },


  {
    name:"Business",

    label:"Professional",

    image:"/3.png",

    className:"bg-business"

  },


  {
    name:"Data-Science",

    label:"Analysis",

    image:"/dig4.png",

    className:"bg-data"

  },


  {
    name:"Digital-Marketing",

    label:"Growth",

    image:"/dig1.png",

    className:"bg-marketing"

  }


];







export default function CategorySidebar(){



return(


<aside className="homepage-sidebar">


<div className="sidebar-sticky-wrapper">



<h3 className="sidebar-main-title">

Explore Categories

</h3>





{

categories.map((category)=>(



<Link

key={category.name}

href={`/search-results?category=${category.name}`}

className="cat-widget-link"

>



<div

className={`cat-widget ${category.className}`}

>



<div className="cat-widget-text">


<span>

{category.label}

</span>



<h4>

{category.name}

</h4>



</div>







<Image

src={category.image}

alt={category.name}

width={120}

height={90}

priority={false}

/>





</div>



</Link>



))


}






<TrendingWidget />





</div>


</aside>


)


}