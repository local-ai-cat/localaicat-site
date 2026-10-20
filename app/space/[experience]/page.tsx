import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteShell } from "../../_components/site-shell";

const experiences = {
  studio: {label:"Cat studio",title:"Make it a little you.", description:"Colours, costumes or every pixel by hand. Meet your own Space Cadet.", file:"cadet.html"},
  cockpit: {label:"Menu bar",title:"Welcome to your cockpit.", description:"Explore the menu-bar concept. These controls are a simulation.", file:"cockpit.html"},
  voyage: {label:"Night voyage",title:"Let your cat wander.", description:"A procedural journey through little worlds. An interactive preview of Night Voyage.", file:"lockscreen.html"},
} as const;

export async function generateMetadata({params}: {params: Promise<{experience:string}>}): Promise<Metadata> {
  const {experience} = await params;
  if (!Object.hasOwn(experiences, experience)) return {};
  const item = experiences[experience as keyof typeof experiences];
  return { title: `${item.label}: ${item.title}`, description: item.description };
}

export default async function SpaceExperiencePage({params}: {params: Promise<{experience:string}>}) {
  const {experience} = await params;
  if (experience === "studio") redirect("/?mode=space&studio=1");
  if (!Object.hasOwn(experiences, experience)) notFound();
  const item = experiences[experience as keyof typeof experiences];
  return <SiteShell wide><section className="spaceDemoPage">
    <Link className="spaceBack" href="/?mode=space">Back to Local AI Cat</Link>
    <div className="spaceDemoHeading"><h1>{item.title}</h1><p>{item.description}</p></div>
    <nav aria-label="Space Cadet experiences" className="spaceDemoTabs">{Object.entries(experiences).map(([key,value])=><Link key={key} href={`/space/${key}`} aria-current={key===experience?"page":undefined}>{value.label}</Link>)}</nav>
    <iframe className={`spaceDemoFrame spaceDemoFrame-${experience}`} src={`/space-demo/${item.file}`} title={item.title} sandbox="allow-scripts allow-same-origin allow-downloads"/>
    </section></SiteShell>;
}
