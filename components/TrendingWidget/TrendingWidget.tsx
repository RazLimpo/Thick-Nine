import Link from "next/link";



interface TrendingItem {

    id:number;

    name:string;

    stats:string;

    query:string;

}





const trendingItems:TrendingItem[] = [


    {
        id:1,

        name:"Logo Design",

        stats:"1.2k+ searches",

        query:"Logo Design"

    },


    {
        id:2,

        name:"AI Image Generation",

        stats:"850 searches",

        query:"AI Models"

    },


    {
        id:3,

        name:"Social Media Manager",

        stats:"600 searches",

        query:"Social Media"

    }


];





export default function TrendingWidget(){


return(


<div className="trending-widget">



<h3 className="sidebar-main-title">


<i className="fas fa-fire" />


Trending Now


</h3>







<ul className="trending-list">



{

trendingItems.map(item=>(



<li key={item.id}>


<Link

href={`/search-results?query=${item.query}`}

>



<span className="trend-rank">

{String(item.id).padStart(2,"0")}

</span>





<div className="trend-info">


<p className="trend-name">

{item.name}

</p>



<span className="trend-stats">

{item.stats}

</span>


</div>





<i className="fas fa-arrow-trend-up" />





</Link>



</li>



))


}



</ul>



</div>


)


}