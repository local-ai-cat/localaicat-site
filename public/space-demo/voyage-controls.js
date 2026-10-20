// Website throttle: one clock for travel, fuel, terrain and the crew.
(function(root){
const profiles=Object.freeze([
 Object.freeze({name:'Low',rate:2,energyMode:'lowPower'}),
 Object.freeze({name:'Medium',rate:4,energyMode:'automatic'}),
 Object.freeze({name:'High',rate:8,energyMode:'highPower'})
]);
function profile(index){return profiles[Number.isInteger(index)?index:-1]||profiles[1];}
function advance(elapsed,anchor,rate,wallTime,running=true){
 return elapsed+(running?Math.max(0,wallTime-anchor)/1000*rate:0);
}
function retime(elapsed,anchor,rate,wallTime,running,index){
 return {elapsed:advance(elapsed,anchor,rate,wallTime,running),anchor:wallTime,...profile(index)};
}
// The voyage never ends: the clock counts on past the hour, and the slider rolls into the next hour at its end.
const timelineHour=3600;
// A trackpad swipe of a few hundred pixels travels a planet or two.
const scrubSecondsPerPixel=.5,linePixels=16;
function clockLabel(seconds){
 const total=Math.max(0,Math.floor(seconds)),hours=Math.floor(total/timelineHour);
 const minutes=String(Math.floor(total%timelineHour/60)).padStart(2,'0'),rest=String(total%60).padStart(2,'0');
 return `${hours?`${hours}:`:''}${minutes}:${rest} / ∞`;
}
function timelineWindow(seconds){
 const min=Math.floor(Math.max(0,seconds)/timelineHour)*timelineHour;
 return {min,max:min+timelineHour-1};
}
function scrub(elapsed,pixels,lineMode=false){
 return Math.max(0,elapsed+pixels*(lineMode?linePixels:1)*scrubSecondsPerPixel);
}
root.SpaceVoyageControls={profiles,profile,advance,retime,clockLabel,timelineWindow,scrub};
})(globalThis);
